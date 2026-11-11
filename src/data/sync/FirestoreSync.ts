import {
  collection, deleteDoc, doc, getDocFromServer, getFirestore, onSnapshot, query, setDoc, waitForPendingWrites, where,
  type DocumentSnapshot, type Firestore, type QuerySnapshot, type Unsubscribe,
} from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import type { DataStore } from '../DataStore';
import type { Entity, Household } from '../../models/entities';
import type { SyncBackend } from '../../services/ports';
import {
  DocApplier, householdDoc, itemDoc, memberDoc, memberKey, optionDoc, purchaseDoc, tripTotalDoc, type DocData,
} from './mapping';
import { APPLY_ORDER, HOUSEHOLDS, type SubCollection } from './schema';

export type SyncStatus =
  | { state: 'idle' }
  | { state: 'syncing' }
  /** No connection. Changes are kept and sent when it's back. */
  | { state: 'offline' }
  | { state: 'failed'; message: string };

export interface SyncHooks {
  /** Server changes were applied to the store (ActivityMonitor scan, reminder refresh). */
  onRemoteChange?: () => void;
  /** A household vanished from the server: deleted by its owner, or this person was removed. */
  onHouseholdRemoved?: (name: string) => void;
  /** After a fetch settles, e.g. to make sure this person has a member record everywhere. */
  onFetched?: () => void;
  onStatus?: (status: SyncStatus) => void;
}

const codeOf = (e: unknown): string => String((e as { code?: unknown })?.code ?? '');
const isOffline = (e: unknown) => ['unavailable', 'firestore/unavailable', 'deadline-exceeded'].includes(codeOf(e).replace('functions/', ''));

/**
 * Keeps the DataStore and Firestore in step (the Firebase replacement for CloudSyncEngine).
 *
 * Local writes go through the services, which call `save` / `delete`; Firestore's offline
 * persistence queues them when there is no connection. Incoming changes are applied through
 * `DocApplier`, which never writes back, and snapshots that only reflect our own pending
 * writes are skipped so an in-flight local edit is never overwritten by an older echo.
 */
export class FirestoreSync implements SyncBackend {
  private readonly db: Firestore = getFirestore();
  private readonly applier: DocApplier;
  private householdListener: Unsubscribe | null = null;
  private readonly perHousehold = new Map<string, Unsubscribe[]>();
  /** Documents whose references hadn't arrived yet, retried after each batch. */
  private readonly incomplete = new Map<string, { kind: SubCollection; householdID: string; key: string; data: DocData }>();
  private readonly lastBanner = new Map<string, string | null>();
  private _status: SyncStatus = { state: 'idle' };

  constructor(
    private readonly store: DataStore,
    private readonly uid: string,
    private readonly hooks: SyncHooks = {},
  ) {
    this.applier = new DocApplier(store, { uid });
  }

  get status(): SyncStatus { return this._status; }
  private setStatus(s: SyncStatus) { this._status = s; this.hooks.onStatus?.(s); }
  private report(error: unknown) {
    if (isOffline(error)) this.setStatus({ state: 'offline' });
    else this.setStatus({ state: 'failed', message: error instanceof Error ? error.message : 'Sync failed' });
  }

  // MARK: Lifecycle

  /** Starts listening. Safe to call repeatedly. */
  start(): void {
    if (this.householdListener) return;
    this.setStatus({ state: 'syncing' });
    const q = query(collection(this.db, HOUSEHOLDS), where('memberUIDs', 'array-contains', this.uid));
    this.householdListener = onSnapshot(q, (snap) => this.onHouseholds(snap), (e) => this.report(e));
  }

  stop(): void {
    this.householdListener?.();
    this.householdListener = null;
    for (const subs of this.perHousehold.values()) subs.forEach((u) => u());
    this.perHousehold.clear();
    this.incomplete.clear();
    this.lastBanner.clear();
    this.setStatus({ state: 'idle' });
  }

  async sendNow(): Promise<void> { await waitForPendingWrites(this.db); }

  // MARK: Incoming

  private onHouseholds(snap: QuerySnapshot): void {
    let changed = false;
    for (const change of snap.docChanges()) {
      const id = change.doc.id;
      if (change.type === 'removed') {
        this.detach(id);
        const name = this.store.household(id)?.name;
        if (this.store.household(id)) {
          this.purge(id);
          if (name !== undefined) this.hooks.onHouseholdRemoved?.(name);
        }
        changed = true;
        continue;
      }
      if (!change.doc.metadata.hasPendingWrites) {
        this.applier.applyHousehold(id, change.doc.data() as DocData);
        changed = true;
      }
      this.attach(id);
    }
    if (changed) this.store.commit();
    this.setStatus({ state: 'idle' });
    this.hooks.onFetched?.();
  }

  private attach(householdID: string): void {
    if (this.perHousehold.has(householdID)) return;
    const subs: Unsubscribe[] = [];
    this.perHousehold.set(householdID, subs);
    for (const kind of APPLY_ORDER) {
      subs.push(onSnapshot(collection(this.db, HOUSEHOLDS, householdID, kind), (snap) => this.onDocs(kind, householdID, snap), (e) => this.report(e)));
    }
    subs.push(onSnapshot(doc(this.db, HOUSEHOLDS, householdID, 'assets', 'banner'), (snap) => this.onBanner(householdID, snap), () => {}));
  }

  private detach(householdID: string): void {
    this.perHousehold.get(householdID)?.forEach((u) => u());
    this.perHousehold.delete(householdID);
    this.lastBanner.delete(householdID);
  }

  private onDocs(kind: SubCollection, householdID: string, snap: QuerySnapshot): void {
    if (!this.store.household(householdID)) return; // household vanished; its removal is handled elsewhere
    let touched = false;
    for (const change of snap.docChanges()) {
      const key = change.doc.id;
      const incompleteKey = `${householdID}/${kind}/${key}`;
      if (change.type === 'removed') {
        if (!change.doc.metadata.hasPendingWrites) this.applier.remove(kind, householdID, key);
        this.incomplete.delete(incompleteKey);
        touched = true;
        continue;
      }
      if (change.doc.metadata.hasPendingWrites) continue; // our own write, already in the store
      const data = change.doc.data() as DocData;
      if (this.applier.apply(kind, householdID, key, data) === 'missingReferences') {
        this.incomplete.set(incompleteKey, { kind, householdID, key, data });
      } else {
        this.incomplete.delete(incompleteKey);
      }
      touched = true;
    }
    this.retryIncomplete();
    if (touched) {
      this.store.commit();
      this.hooks.onRemoteChange?.();
    }
    this.setStatus({ state: 'idle' });
  }

  private onBanner(householdID: string, snap: DocumentSnapshot): void {
    if (snap.metadata.hasPendingWrites) return;
    const data = snap.exists() ? (snap.data() as DocData | undefined)?.data : null;
    this.applier.applyBanner(householdID, typeof data === 'string' ? data : null);
    this.store.commit();
  }

  private retryIncomplete(): void {
    if (this.incomplete.size === 0) return;
    const pending = [...this.incomplete.entries()].sort(([, a], [, b]) => APPLY_ORDER.indexOf(a.kind) - APPLY_ORDER.indexOf(b.kind));
    for (const [k, p] of pending) {
      // Apply once more; anything still missing keeps an empty reference.
      if (this.applier.apply(p.kind, p.householdID, p.key, p.data) === 'applied') this.incomplete.delete(k);
    }
  }

  /** Removes a household that no longer exists on the server from this device. */
  private purge(householdID: string): void {
    this.store.removedHouseholds.add(householdID);
    this.store.deleteHouseholdData(householdID);
  }

  // MARK: Outgoing (SyncBackend)

  save(changed: Entity[]): void {
    for (const e of changed) {
      const target = this.target(e);
      if (!target) continue;
      void setDoc(target.ref, target.data, { merge: true }).catch((err) => this.report(err));
      if (this.store.kindOf(e) === 'household') this.sendBanner(e as Household);
    }
  }

  delete(removed: Entity[]): void {
    for (const e of removed) {
      const target = this.target(e);
      if (target) void deleteDoc(target.ref).catch((err) => this.report(err));
    }
  }

  createHousehold(household: Household): void {
    const ref = doc(this.db, HOUSEHOLDS, household.id);
    void setDoc(ref, { ...householdDoc(household), ownerUID: this.uid, memberUIDs: [this.uid] }).catch((err) => this.report(err));
    this.sendBanner(household);
  }

  deleteHousehold(household: Household): void {
    // The Admin SDK removes the whole subtree, which a client can't do atomically.
    void httpsCallable(getFunctions(), 'deleteHousehold')({ householdID: household.id }).catch((err) => this.report(err));
  }

  async leave(household: Household): Promise<void> {
    await httpsCallable(getFunctions(), 'leaveHousehold')({ householdID: household.id });
  }

  async deleteNow(entity: Entity): Promise<void> {
    const target = this.target(entity);
    if (target) await deleteDoc(target.ref);
  }

  /** Asks the server whether a household still exists, before acting on it. */
  async availability(household: Household): Promise<'available' | 'gone' | 'unknown'> {
    try {
      const snap = await getDocFromServer(doc(this.db, HOUSEHOLDS, household.id));
      return snap.exists() ? 'available' : 'gone';
    } catch (e) {
      // Reading a household you're no longer a member of is rejected by the rules.
      if (codeOf(e).includes('permission-denied')) return 'gone';
      return 'unknown'; // offline or busy: treat as available
    }
  }

  // MARK: Helpers

  private sendBanner(h: Household): void {
    if (this.lastBanner.get(h.id) === h.customImage) return;
    this.lastBanner.set(h.id, h.customImage);
    const ref = doc(this.db, HOUSEHOLDS, h.id, 'assets', 'banner');
    const op = h.customImage ? setDoc(ref, { data: h.customImage }) : deleteDoc(ref);
    void op.catch((err) => this.report(err));
  }

  private target(e: Entity): { ref: ReturnType<typeof doc>; data: DocData } | null {
    const kind = this.store.kindOf(e);
    if (!kind) return null;
    const db = this.db;
    switch (kind) {
      case 'household': { const h = e as Household; return { ref: doc(db, HOUSEHOLDS, h.id), data: householdDoc(h) }; }
      case 'member': { const m = e as import('../../models/entities').HouseholdMember; return { ref: doc(db, HOUSEHOLDS, m.householdID, 'members', memberKey(m)), data: memberDoc(m) }; }
      case 'option': { const o = e as import('../../models/entities').CustomOption; return { ref: doc(db, HOUSEHOLDS, o.householdID, 'options', o.id), data: optionDoc(o) }; }
      case 'item': { const i = e as import('../../models/entities').GroceryItem; return { ref: doc(db, HOUSEHOLDS, i.householdID, 'items', i.id), data: itemDoc(i) }; }
      case 'purchase': { const p = e as import('../../models/entities').PurchaseRecord; return { ref: doc(db, HOUSEHOLDS, p.householdID, 'purchases', p.id), data: purchaseDoc(p) }; }
      case 'tripTotal': { const t = e as import('../../models/entities').TripTotal; return { ref: doc(db, HOUSEHOLDS, t.householdID, 'tripTotals', t.id), data: tripTotalDoc(t) }; }
    }
  }
}

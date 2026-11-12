import { NameNormalizer } from '../logic/NameNormalizer';
import type { HouseholdTheme, ListGrouping } from '../models/enums';
import type { Household, HouseholdMember, TripTotal, UserProfile } from '../models/entities';
import { makeHousehold, makeMember, makeTripTotal, sameProfile } from '../models/factories';
import { ShoppingListService } from './ShoppingListService';
import { isHouseholdGone, type ServiceEnv } from './ports';

export type RemovalOutcome = 'removed' | 'alreadyGone';

export class HouseholdService {
  constructor(private readonly env: ServiceEnv) {}
  private get store() { return this.env.store; }

  households(): Household[] { return this.store.allHouseholds(); }
  household(id: string): Household | undefined { return this.store.household(id); }

  create(name: string, userRecordName: string, profile: UserProfile, at: Date = new Date()): Household {
    const clean = NameNormalizer.displayName(name);
    const household = this.store.insertHousehold(makeHousehold({
      name: clean === '' ? `${profile.name}'s household` : clean,
      ownerRecordName: userRecordName,
      isOwnedByMe: true,
      createdAt: at,
    }));
    this.store.commit();
    this.env.sync?.createHousehold(household);
    this.ensureMembership(household, userRecordName, profile);
    return household;
  }

  rename(household: Household, name: string): void {
    if (!this.isLive(household)) return;
    const clean = NameNormalizer.displayName(name);
    if (clean === '' || clean === household.name) return;
    household.name = clean;
    this.persist(household);
  }

  setGrouping(grouping: ListGrouping, household: Household): void {
    if (!this.isLive(household) || household.groupingRaw === grouping) return;
    household.groupingRaw = grouping;
    this.persist(household);
  }

  setSectionOrder(keys: string[], household: Household): void {
    if (!this.isLive(household)) return;
    const reordered = new Set(keys);
    household.sectionOrder = [...keys, ...household.sectionOrder.filter((k) => !reordered.has(k))];
    this.persist(household);
  }

  setCurrency(code: string, household: Household): void {
    if (!this.isLive(household) || household.currencyCode === code) return;
    household.currencyCode = code;
    this.persist(household);
  }

  saveTripTotal(a: {
    tripKey: string; householdID: string; endedAt: Date; amount: number; currencyCode: string;
    storeName: string | null; by: string | null;
  }): TripTotal {
    const existing = this.store.tripTotalFor(a.householdID, a.tripKey);
    const cleanStore = a.storeName ? NameNormalizer.displayName(a.storeName) || null : null;
    let total: TripTotal;
    if (existing) {
      total = existing;
      total.amount = a.amount;
      total.currencyCode = a.currencyCode;
      total.storeName = cleanStore;
    } else {
      total = this.store.insertTripTotal(makeTripTotal({
        householdID: a.householdID, tripKey: a.tripKey, amount: a.amount, currencyCode: a.currencyCode,
        storeName: cleanStore, tripEndedAt: a.endedAt, enteredBy: a.by,
      }));
    }
    this.store.commit();
    this.env.sync?.save([total]);
    return total;
  }

  deleteTripTotal(total: TripTotal): void {
    this.env.sync?.delete([total]);
    this.store.deleteTripTotal(total);
    this.store.commit();
  }

  setTheme(theme: HouseholdTheme, household: Household): void {
    if (!this.isLive(household)) return;
    household.themeRaw = theme;
    household.customImage = null;
    this.persist(household);
  }

  setCustomImage(image: string | null, household: Household, focusX = 0.5, focusY = 0.5): void {
    if (!this.isLive(household)) return;
    household.customImage = image;
    household.imageFocusX = Math.min(Math.max(focusX, 0), 1);
    household.imageFocusY = Math.min(Math.max(focusY, 0), 1);
    this.persist(household);
  }

  ensureMembership(household: Household, userRecordName: string, profile: UserProfile): HouseholdMember {
    const existing = this.store.member(userRecordName, household.id);
    if (existing) {
      const current: UserProfile = { name: existing.name, emoji: existing.emoji, colorHex: existing.colorHex };
      if (!sameProfile(current, profile)) {
        existing.name = profile.name; existing.emoji = profile.emoji; existing.colorHex = profile.colorHex;
        this.store.commit();
        this.env.sync?.save([existing]);
      }
      return existing;
    }
    const member = this.store.insertMember(makeMember(household.id, userRecordName, profile));
    this.store.commit();
    this.env.sync?.save([member]);
    return member;
  }

  updateProfile(profile: UserProfile, userRecordName: string): void {
    for (const h of this.households()) this.ensureMembership(h, userRecordName, profile);
  }

  async remove(household: Household): Promise<RemovalOutcome> {
    const id = household.id;
    if (!this.isLive(household)) return 'alreadyGone';
    const sync = this.env.sync;

    if (sync && (await sync.availability(household)) === 'gone') {
      this.purgeLocal(id);
      return 'alreadyGone';
    }

    try {
      if (household.isOwnedByMe) {
        sync?.deleteHousehold(household);
      } else {
        // Take this person off the member list first; access ends once they leave.
        const key = this.env.prefs.userRecordName;
        const member = key ? this.store.member(key, id) : undefined;
        if (member) await sync?.deleteNow(member);
        await sync?.leave(household);
      }
    } catch (error) {
      if (isHouseholdGone(error)) {
        this.purgeLocal(id);
        return 'alreadyGone';
      }
      throw error;
    }
    this.purgeLocal(id);
    return 'removed';
  }

  async verify(household: Household): Promise<boolean> {
    if (!this.isLive(household)) return false;
    const sync = this.env.sync;
    if (!sync || (await sync.availability(household)) !== 'gone') return true;
    this.purgeLocal(household.id);
    return false;
  }

  isLive(household: Household): boolean {
    return this.store.isLiveHousehold(household.id) && this.store.household(household.id) === household;
  }

  async deleteMyData(): Promise<void> {
    for (const h of this.households()) await this.remove(h);
    await this.env.sync?.sendNow();
    this.eraseEverything();
    this.env.sync?.stop();
    await this.env.notifier.removeAll();
  }

  purgeLocal(householdID: string): void {
    this.store.removedHouseholds.add(householdID);
    this.store.deleteHouseholdData(householdID);
    this.store.commit();
    if (this.env.prefs.currentHouseholdID === householdID) {
      this.env.prefs.currentHouseholdID = this.households()[0]?.id ?? null;
    }
    ShoppingListService.refreshRestockReminders(this.env);
  }

  eraseEverything(): void {
    this.store.eraseEverything();
    this.store.commit();
    ShoppingListService.refreshRestockReminders(this.env);
  }

  private persist(household: Household): void {
    this.store.commit();
    this.env.sync?.save([household]);
  }
}

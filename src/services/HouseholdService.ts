import { NameNormalizer } from '../logic/NameNormalizer';
import type { HouseholdTheme, ListGrouping } from '../models/enums';
import type { Household, HouseholdMember, TripTotal, UserProfile } from '../models/entities';
import { makeHousehold, makeMember, makeTripTotal, sameProfile } from '../models/factories';
import { ShoppingListService } from './ShoppingListService';
import { isHouseholdGone, type ServiceEnv } from './ports';

export type RemovalOutcome = 'removed' | 'alreadyGone';

/**
 * Creates, joins, leaves and deletes households, and keeps this person's member record in
 * each one up to date. Like ShoppingListService, screens call these intent-level methods.
 */
export class HouseholdService {
  constructor(private readonly env: ServiceEnv) {}
  private get store() { return this.env.store; }

  households(): Household[] { return this.store.allHouseholds(); }
  household(id: string): Household | undefined { return this.store.household(id); }

  /** Creates a household owned by this person, with them as its first member. */
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

  /** Saves a new section order for the current grouping, keeping the order of other groupings intact. */
  setSectionOrder(keys: string[], household: Household): void {
    if (!this.isLive(household)) return;
    const reordered = new Set(keys);
    household.sectionOrder = [...keys, ...household.sectionOrder.filter((k) => !reordered.has(k))];
    this.persist(household);
  }

  /** Sets the currency for shopping totals. An empty code goes back to the device's region. */
  setCurrency(code: string, household: Household): void {
    if (!this.isLive(household) || household.currencyCode === code) return;
    household.currencyCode = code;
    this.persist(household);
  }

  /** Records what a shopping trip cost. Replaces an earlier total for the same trip. */
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

  /** Uses a photo as the banner. `image` should already be downscaled; focus (0…1) picks what stays visible when cropped. */
  setCustomImage(image: string | null, household: Household, focusX = 0.5, focusY = 0.5): void {
    if (!this.isLive(household)) return;
    household.customImage = image;
    household.imageFocusX = Math.min(Math.max(focusX, 0), 1);
    household.imageFocusY = Math.min(Math.max(focusY, 0), 1);
    this.persist(household);
  }

  /** Adds this person's member record if the household doesn't have one yet, or refreshes it when their profile changed. */
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

  /** Applies an edited profile to this person's membership in every household. */
  updateProfile(profile: UserProfile, userRecordName: string): void {
    for (const h of this.households()) this.ensureMembership(h, userRecordName, profile);
  }

  /**
   * The owner deletes the household for everyone; anyone else just leaves it. Checks the
   * server first, so removing a household that no longer exists just tidies this device.
   */
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

  /** Asks the server whether a household still exists. If not, it's removed from this device and false is returned. */
  async verify(household: Household): Promise<boolean> {
    if (!this.isLive(household)) return false;
    const sync = this.env.sync;
    if (!sync || (await sync.availability(household)) !== 'gone') return true;
    this.purgeLocal(household.id);
    return false;
  }

  /** False once the household was deleted on this device. Every change goes through this check first. */
  isLive(household: Household): boolean {
    return this.store.isLiveHousehold(household.id) && this.store.household(household.id) === household;
  }

  /** Deletes everything this person has: owned households go for everyone, joined ones are left. */
  async deleteMyData(): Promise<void> {
    for (const h of this.households()) await this.remove(h);
    await this.env.sync?.sendNow();
    this.eraseEverything();
    this.env.sync?.stop();
    await this.env.notifier.removeAll();
  }

  /** Deletes a household and everything in it from this device only. */
  purgeLocal(householdID: string): void {
    this.store.removedHouseholds.add(householdID);
    this.store.deleteHouseholdData(householdID);
    this.store.commit();
    if (this.env.prefs.currentHouseholdID === householdID) {
      this.env.prefs.currentHouseholdID = this.households()[0]?.id ?? null;
    }
    ShoppingListService.refreshRestockReminders(this.env);
  }

  /** Removes every household from this device, e.g. after signing out. */
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

import { requireOptionalNativeModule } from 'expo-modules-core';

/** Raw rows as read from the old Swift app's store. See `LegacyStoreReader.swift` for what is decoded natively. */
export type LegacyRow = Record<string, string | number | string[] | null>;
export interface LegacyStore {
  households: LegacyRow[];
  members: LegacyRow[];
  options: LegacyRow[];
  items: LegacyRow[];
  purchases: LegacyRow[];
  tripTotals: LegacyRow[];
}
export interface LegacyDefaults {
  userRecordName?: string;
  currentHouseholdID?: string;
  deviceID?: string;
  /** JSON of the old `UserProfile`. */
  profile?: string;
  hasSeenWelcome?: boolean;
  notifyPurchases?: boolean;
  notifyRestock?: boolean;
  announcedTrips?: Record<string, number>;
  skippedTrips?: string[];
}

interface Native {
  readStore(): Promise<LegacyStore | null>;
  readDefaults(): Promise<LegacyDefaults>;
}

// Only exists on iOS builds; Android never had the old app.
const native = requireOptionalNativeModule<Native>('ShopzyLegacy');

export const ShopzyLegacy = {
  readStore: async (): Promise<LegacyStore | null> => (native ? native.readStore() : null),
  readDefaults: async (): Promise<LegacyDefaults> => (native ? native.readDefaults() : {}),
};

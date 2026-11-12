import Constants from 'expo-constants';
import { doc, getDoc, getFirestore, setDoc } from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { ShopzyLegacy } from '../../modules/shopzy-legacy';
import { AppLog } from '../services/AppLog';
import type { MigrationDeps } from './MigrationService';

export function firebaseMigrationDeps(): MigrationDeps {
  const call = <Req, Res>(name: string) => httpsCallable<Req, Res>(getFunctions(), name, { timeout: 120_000 });
  return {
    readStore: () => ShopzyLegacy.readStore(),
    readDefaults: () => ShopzyLegacy.readDefaults(),
    getUserDoc: async (uid) => {
      const snap = await getDoc(doc(getFirestore(), 'users', uid));
      return snap.exists() ? (snap.data() as { migrationState?: string; legacyUserKey?: string }) : null;
    },
    setUserDoc: (uid, data) => setDoc(doc(getFirestore(), 'users', uid), data, { merge: true }),
    claim: async (payload) => (await call<Record<string, unknown>, { created: boolean }>('claimLegacyHousehold')(payload)).data,
    importRecords: async (payload) => (await call<typeof payload, { created: number }>('importLegacyRecords')(payload)).data,
    legacyAvailable: ShopzyLegacy.isAvailable,
    log: (message) => AppLog.info('account', message),
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    environment: (Constants.expoConfig?.extra?.appEnv as string | undefined) ?? 'development',
    now: () => new Date(),
  };
}

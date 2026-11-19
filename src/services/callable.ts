import { getAuth } from '@react-native-firebase/auth';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

const isUnauthenticated = (e: unknown): boolean => String((e as { code?: unknown } | null)?.code ?? '').endsWith('unauthenticated');

// A stale sign-in token (expired, or the phone's clock is off) is rejected before the function runs.
// Fetching a fresh one and trying once more fixes that without asking the person to sign in again.
export async function callFunction<Data = unknown, Result = unknown>(name: string, data?: Data): Promise<Result> {
  const call = () => httpsCallable<Data, Result>(getFunctions(), name)(data as Data);
  try {
    return (await call()).data;
  } catch (error) {
    if (!isUnauthenticated(error)) throw error;
    try {
      await getAuth().currentUser?.getIdToken(true);
    } catch {
      throw error;
    }
    return (await call()).data;
  }
}

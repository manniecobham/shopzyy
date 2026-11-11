import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { AppRuntime } from './AppRuntime';

const Ctx = createContext<AppRuntime | null>(null);

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const runtime = useMemo(() => new AppRuntime(), []);
  useEffect(() => { void runtime.start(); }, [runtime]);
  return <Ctx.Provider value={runtime}>{children}</Ctx.Provider>;
}

export function useRuntime(): AppRuntime {
  const r = useContext(Ctx);
  if (!r) throw new Error('useRuntime must be used inside <RuntimeProvider>');
  return r;
}

/** Re-renders when anything in the store changes (the equivalent of SwiftData's @Query). */
export function useStoreVersion(): number {
  const { store } = useRuntime();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/** Re-renders on sign-in/profile changes. */
export function useAccount() {
  const { account } = useRuntime();
  useSyncExternalStore(account.subscribe, account.getSnapshot);
  return account;
}

/** Re-renders on runtime changes (ready flag, sync status). */
export function useAppState() {
  const runtime = useRuntime();
  useSyncExternalStore(runtime.subscribe, runtime.getSnapshot);
  return runtime;
}

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

export function useStoreVersion(): number {
  const { store } = useRuntime();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

export function useAccount() {
  const { account } = useRuntime();
  useSyncExternalStore(account.subscribe, account.getSnapshot);
  return account;
}

export function useAppState() {
  const runtime = useRuntime();
  useSyncExternalStore(runtime.subscribe, runtime.getSnapshot);
  return runtime;
}

const TRANSIENT = ['unavailable', 'deadline-exceeded', 'aborted', 'internal', 'resource-exhausted', 'cancelled', 'unknown'];

const codeOf = (e: unknown): string => String((e as { code?: unknown })?.code ?? '').replace(/^(firestore|functions)\//, '');

export const isTransient = (e: unknown): boolean => TRANSIENT.includes(codeOf(e));

export interface RetryOptions { attempts?: number; baseMs?: number; sleep?: (ms: number) => Promise<void> }

// Retries a write that failed for a reason that can pass (network, busy server). Rejections such as
// permission-denied are final: the server refused them, and the local copy is reverted by the listener.
export async function withRetry<T>(op: () => Promise<T>, { attempts = 4, baseMs = 1000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }: RetryOptions = {}): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await op();
    } catch (error) {
      if (attempt >= attempts || !isTransient(error)) throw error;
      await sleep(baseMs * 2 ** (attempt - 1));
    }
  }
}

import { Observable } from '../lib/observable';
import { isHouseholdGone } from './ports';

/** Thrown when someone tries to change a household that was deleted, or that they were removed from. */
export class HouseholdUnavailableError extends Error {
  readonly householdGone = true;
  constructor(message = 'This household no longer exists. It may have been deleted by its owner.') {
    super(message);
    this.name = 'HouseholdUnavailableError';
  }
}

const codeOf = (e: unknown): string => String((e as { code?: unknown } | null)?.code ?? '').replace(/^(auth|functions|firestore)\//, '');

/**
 * Turns technical errors into short, plain messages for people. The technical details go to
 * AppLog instead of the screen.
 */
export const UserFacingError = {
  message(error: unknown): string {
    if (error instanceof HouseholdUnavailableError) return error.message;
    switch (codeOf(error)) {
      case 'network-request-failed':
      case 'unavailable':
      case 'deadline-exceeded':
        return "You're offline. Check your internet connection and try again.";
      case 'unauthenticated':
      case 'user-token-expired':
      case 'requires-recent-login':
        return 'Sign in again to continue.';
      case 'invalid-credential':
      case 'wrong-password':
      case 'user-not-found':
      case 'invalid-email':
        return 'That email or password is not right.';
      case 'email-already-in-use':
        return 'There is already an account with that email. Try signing in instead.';
      case 'weak-password':
        return 'Choose a longer password (at least 6 characters).';
      case 'too-many-requests':
      case 'resource-exhausted':
        return 'Too many attempts. Please try again in a moment.';
      case 'not-found':
        return 'This household no longer exists.';
      case 'permission-denied':
        return "You don't have permission to change this household.";
      case 'failed-precondition':
        return (error as { message?: string }).message || 'Something went wrong. Please try again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  },

  isHouseholdGone,
};

/**
 * A one-off message shown by the root screen, for events that outlive the screen that caused
 * them, e.g. "This household was deleted by its owner."
 */
export interface NoticeMessage { id: number; title: string; detail: string }

class AppNoticeCenter extends Observable {
  current: NoticeMessage | null = null;
  private seq = 0;
  show(title: string, detail: string): void {
    this.current = { id: ++this.seq, title, detail };
    this.changed();
  }
  dismiss(): void {
    this.current = null;
    this.changed();
  }
}
export const AppNotice = new AppNoticeCenter();

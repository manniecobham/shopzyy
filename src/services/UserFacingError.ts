import { Observable } from '../lib/observable';
import { t } from '../i18n';
import { isHouseholdGone } from './ports';

export class HouseholdUnavailableError extends Error {
  readonly householdGone = true;
  constructor(message = t('This household no longer exists. It may have been deleted by its owner.')) {
    super(message);
    this.name = 'HouseholdUnavailableError';
  }
}

const codeOf = (e: unknown): string => String((e as { code?: unknown } | null)?.code ?? '').replace(/^(auth|functions|firestore)\//, '');

export const UserFacingError = {
  message(error: unknown): string {
    if (error instanceof HouseholdUnavailableError) return error.message;
    switch (codeOf(error)) {
      case 'network-request-failed':
      case 'unavailable':
      case 'deadline-exceeded':
        return t("You're offline. Check your internet connection and try again.");
      case 'unauthenticated':
      case 'user-token-expired':
      case 'requires-recent-login':
        return t('Sign in again to continue.');
      case 'invalid-credential':
      case 'wrong-password':
      case 'user-not-found':
      case 'invalid-email':
        return t('That email or password is not right.');
      case 'email-already-in-use':
        return t('There is already an account with that email. Try signing in instead.');
      case 'weak-password':
        return t('Choose a longer password (at least 6 characters).');
      case 'too-many-requests':
      case 'resource-exhausted':
        return t('Too many attempts. Please try again in a moment.');
      case 'not-found':
        return t('This household no longer exists.');
      case 'permission-denied':
        return t("You don't have permission to change this household.");
      case 'already-exists':
      case 'failed-precondition':
        return (error as { message?: string }).message || t('Something went wrong. Please try again.');
      default:
        return t('Something went wrong. Please try again.');
    }
  },

  isHouseholdGone,
};

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

import { language } from '../i18n';

/**
 * Fields to merge into this device's `users/{uid}/devices/{deviceID}` document so the alert functions can
 * write notifications in the person's language. Spread into the existing setDoc payloads.
 */
export const deviceLanguageField = (): { language: string } => ({ language: language() });

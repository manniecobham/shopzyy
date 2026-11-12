import { language } from '../i18n';

export const deviceLanguageField = (): { language: string } => ({ language: language() });

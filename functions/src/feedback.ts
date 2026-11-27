export const FEEDBACK_KINDS = ['idea', 'problem', 'other'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export interface CleanFeedback {
  kind: FeedbackKind;
  message: string;
  contactMe: boolean;
  appVersion: string;
  platform: string;
  osVersion: string;
  language: string;
}

const short = (value: unknown, max: number): string => String(value ?? '').trim().slice(0, max);

// Returns null when there is no usable message.
export function cleanFeedback(data: Record<string, unknown> | undefined): CleanFeedback | null {
  const message = short(data?.message, 1000);
  if (message.length < 3) return null;
  const kind = (FEEDBACK_KINDS as readonly string[]).includes(String(data?.kind)) ? (data?.kind as FeedbackKind) : 'other';
  const platform = short(data?.platform, 10);
  return {
    kind,
    message,
    contactMe: data?.contactMe === true,
    appVersion: short(data?.appVersion, 20),
    platform: platform === 'ios' || platform === 'android' ? platform : 'unknown',
    osVersion: short(data?.osVersion, 20),
    language: short(data?.language, 5),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const REVIEW_MIN_PURCHASES = 15;
export const REVIEW_MIN_DAYS = 3;
export const REVIEW_REPEAT_MS = 120 * DAY_MS;

// Ask only people who have really used the app, and not again for a long while.
export function shouldAskForReview(purchaseDates: Date[], lastAskedAt: number | null, now: number): boolean {
  if (lastAskedAt !== null && now - lastAskedAt < REVIEW_REPEAT_MS) return false;
  if (purchaseDates.length < REVIEW_MIN_PURCHASES) return false;
  const days = new Set(purchaseDates.map((d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`));
  return days.size >= REVIEW_MIN_DAYS;
}

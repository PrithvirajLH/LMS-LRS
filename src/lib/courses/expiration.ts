/**
 * CE (Continuing Education) credit expiration tracking.
 *
 * Healthcare orgs require recurring renewal of training credits. Courses
 * specify a validity window (months) — when a learner completes the course,
 * the enrollment's `expiresAt` is computed as `completedDate + validityPeriodMonths`.
 *
 * After expiration, the credit is considered lapsed and must be re-earned
 * (typically by re-taking the course).
 */

/** How many days before expiry we start showing "expiring soon" warnings. */
export const EXPIRING_SOON_DAYS = 60;

export type ExpirationStatus = "valid" | "expiring_soon" | "expired" | "no_expiry";

/**
 * Calculate the expiration date for a credit earned today.
 * Returns ISO string, or empty string if the course has no validity period.
 */
export function calculateExpirationDate(
  completedDate: string,
  validityPeriodMonths?: number
): string {
  if (!validityPeriodMonths || validityPeriodMonths <= 0) return "";
  const d = new Date(completedDate);
  if (isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + validityPeriodMonths);
  return d.toISOString();
}

/**
 * Get the current status of a credit based on its expiration date.
 */
export function getExpirationStatus(expiresAt: string | undefined): ExpirationStatus {
  if (!expiresAt) return "no_expiry";
  const expiry = new Date(expiresAt).getTime();
  if (isNaN(expiry)) return "no_expiry";
  const now = Date.now();
  if (expiry < now) return "expired";
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (daysLeft <= EXPIRING_SOON_DAYS) return "expiring_soon";
  return "valid";
}

/** Days remaining until expiration. Negative if expired. Null if no expiry. */
export function daysUntilExpiry(expiresAt: string | undefined): number | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt).getTime();
  if (isNaN(expiry)) return null;
  return Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24));
}

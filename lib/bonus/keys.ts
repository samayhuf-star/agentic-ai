export const BONUS_KEYS = ["swipe", "updates", "templates", "support"] as const;

export type BonusKey = (typeof BONUS_KEYS)[number];

export const BONUS_LABELS: Record<BonusKey, string> = {
  swipe: "Prompt swipe file",
  updates: "Monthly prompt updates",
  templates: "Template library",
  support: "Priority email support",
};

/** Gap after the sign-in email, then between each bonus email. */
export const BONUS_GAP_MS = 3 * 60 * 1000;

export function bonusDelayMs(index: number) {
  return (index + 1) * BONUS_GAP_MS;
}

export const BONUS_MAX_ATTEMPTS = 3;

export const BONUS_RETRY_MS = 5 * 60 * 1000;

export function isBonusKey(value: string): value is BonusKey {
  return (BONUS_KEYS as readonly string[]).includes(value);
}

/**
 * Single source of truth for the referral reward business rule, confirmed
 * by the client:
 *
 *   The referral reward is 10% of the referred customer's FIRST PAYMENT
 *   ONLY. It is a one-time reward. It does NOT apply to subsequent monthly
 *   payments, and does NOT scale with how long the referred customer stays
 *   subscribed.
 *
 * This must always be calculated from the actual recorded first-payment
 * amount -- never from a tier's list price, and never re-derived later from
 * "current" pricing (which can change via admin overrides, see the pricing
 * module). Nothing outside this file should compute a referral reward.
 */

/** The current referral rate. Stored on each Referral record at the time it qualifies (see Referral.schema.ts `rewardPercentage`) so historical rewards stay correct even if this rate changes later. */
export const REFERRAL_REWARD_PERCENTAGE = 10;

/**
 * @param firstPaymentAmount The actual amount charged for the referred
 *   customer's first payment, in pounds (e.g. 99, 249, 449) -- never a tier
 *   list price, always the real recorded charge.
 * @param rewardPercentage Defaults to the current platform rate. Callers
 *   recalculating a historical reward should pass the rate stored on that
 *   specific Referral record instead of the current constant.
 */
export function calculateReferralReward(
  firstPaymentAmount: number,
  rewardPercentage: number = REFERRAL_REWARD_PERCENTAGE
): number {
  if (firstPaymentAmount < 0) {
    throw new Error('firstPaymentAmount cannot be negative');
  }
  const raw = firstPaymentAmount * (rewardPercentage / 100);
  return Math.round(raw * 100) / 100;
}

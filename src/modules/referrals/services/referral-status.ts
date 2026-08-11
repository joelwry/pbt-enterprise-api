import type { ReferralStatus } from '@/modules/referrals/schemas/Referral.schema';

/**
 * Human-readable label for a referral's lifecycle status. Used for both the
 * member-facing Referral Hub and the admin Referral Management screen so
 * the two never drift apart.
 */
export const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  REFERRED: 'Pending',
  CUSTOMER_SIGNED_UP: 'Pending',
  AWAITING_FIRST_PAYMENT: 'Awaiting first payment',
  // Never actually persisted (see the ReferralStatus docstring in the
  // schema) -- mapped anyway so this lookup table is total over the enum.
  FIRST_PAYMENT_RECEIVED: 'Reward earned',
  REWARD_EARNED: 'Reward earned',
  PAYMENT_PENDING: 'Payment pending',
  PAID: 'Paid',
};

/**
 * The 5 filter buckets the admin Referral Management screen exposes,
 * each mapped to the underlying status value(s) it covers. `REFERRED` and
 * `CUSTOMER_SIGNED_UP` collapse into a single "Pending" bucket since they're
 * both "referral exists, nothing has happened yet" from an admin's point of
 * view.
 */
export const REFERRAL_FILTER_BUCKETS: Record<string, ReferralStatus[]> = {
  PENDING: ['REFERRED', 'CUSTOMER_SIGNED_UP'],
  AWAITING_FIRST_PAYMENT: ['AWAITING_FIRST_PAYMENT'],
  REWARD_EARNED: ['FIRST_PAYMENT_RECEIVED', 'REWARD_EARNED'],
  PAYMENT_PENDING: ['PAYMENT_PENDING'],
  PAID: ['PAID'],
};

export type ReferralFilterKey = keyof typeof REFERRAL_FILTER_BUCKETS;

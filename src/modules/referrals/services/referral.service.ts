import { Types } from 'mongoose';
import { Referral } from '@/modules/referrals/schemas/Referral.schema';
import { User } from '@/modules/users/schemas/User.schema';
import { config } from '@/config/environment';
import { calculateReferralReward, REFERRAL_REWARD_PERCENTAGE } from '@/modules/referrals/services/referral-reward.service';
import { REFERRAL_STATUS_LABEL } from '@/modules/referrals/services/referral-status';
import { TIER_LABEL } from '@/modules/pricing/services/pricing.service';
import type { BillingTier, BillingCycle } from '@/core/payments/StripeService';
import logger from '@/core/logger/logger';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export class ReferralService {
  /** Every member's referral code is simply their own account id (already shown to them as "Client ID" everywhere else in the portal) -- no separate code to generate, store, or collide. */
  async getSummary(userId: string) {
    const referrals = await Referral.find({ referrerId: userId });

    const rewardsEarned = referrals.reduce((sum, r) => sum + (r.rewardAmount ?? 0), 0);
    const rewardsPaid = referrals
      .filter((r) => r.status === 'PAID')
      .reduce((sum, r) => sum + (r.rewardAmount ?? 0), 0);

    return {
      referralCode: userId,
      referralLink: `${config.FRONTEND_URL}/join?ref=${userId}`,
      totalReferrals: referrals.length,
      rewardsEarned: round2(rewardsEarned),
      rewardsPaid: round2(rewardsPaid),
      rewardPercentage: REFERRAL_REWARD_PERCENTAGE,
      rewardDescriptionLabel: `Earn ${REFERRAL_REWARD_PERCENTAGE}% of your referred customer's first payment`,
    };
  }

  async getReferredMembers(userId: string, page: number, limit: number) {
    const filter = { referrerId: userId };
    const [referrals, totalItems] = await Promise.all([
      Referral.find(filter)
        .populate('referredUserId', 'fullName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Referral.countDocuments(filter),
    ]);

    const items = referrals.map((r: any) => ({
      id: r._id.toString(),
      memberName: r.referredUserId?.fullName ?? 'Deleted member',
      joinedLabel: r.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      tierLabel: r.referredTier ? TIER_LABEL[r.referredTier as BillingTier] : null,
      firstPaymentAmount: r.firstPaymentAmount ?? null,
      rewardAmount: r.rewardAmount ?? null,
      status: r.status,
      statusLabel: REFERRAL_STATUS_LABEL[r.status as keyof typeof REFERRAL_STATUS_LABEL],
      paidDateLabel: r.paidAt ? r.paidAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
    }));

    return { items, totalItems };
  }

  /**
   * Called from the legacy, payment-less `POST /auth/register` path only
   * (see auth.service.ts -- not reachable from the real /join signup flow,
   * which always goes through Stripe Checkout). Records that a referral
   * happened, with no qualifying payment yet -- this referral will sit at
   * CUSTOMER_SIGNED_UP indefinitely unless something else later confirms a
   * first payment for this same user, which nothing in this codebase
   * currently does for an account created this way.
   *
   * Silently no-ops on an invalid/self/duplicate code rather than blocking
   * account creation, since a referral is a bonus on top of signup, never a
   * requirement for it.
   */
  async recordReferral(referralCode: string | undefined, referredUserId: string): Promise<void> {
    if (!referralCode || referralCode === referredUserId) return;

    try {
      const referrer = await User.findById(referralCode);
      if (!referrer) return;

      await Referral.create({
        referrerId: referralCode,
        referredUserId,
        status: 'CUSTOMER_SIGNED_UP',
        rewardPercentage: REFERRAL_REWARD_PERCENTAGE,
      });
      logger.info('Referral recorded (no qualifying payment yet)', { referrerId: referralCode, referredUserId });
    } catch (error) {
      // Duplicate referredUserId (already credited) or a malformed code -- either way, never fail registration over it.
      logger.warn('Referral not recorded', { referralCode, referredUserId, error });
    }
  }

  /**
   * The real, live path: called only from the Stripe Checkout webhook
   * (`billingService.handleCheckoutCompleted`, `intent === 'signup'`) at
   * the exact moment a brand-new member's first payment is confirmed.
   * Signup and first-payment confirmation happen atomically here, so the
   * referral is created already qualified (REWARD_EARNED) in one step --
   * see the ReferralStatus docstring in the schema for why.
   *
   * The reward is always calculated from `payment.amount`, the actual
   * amount Stripe charged (passed in by the caller from
   * `session.amount_total`) -- never a tier's list price. Idempotency is
   * inherited from the caller: `handleCheckoutCompleted` already
   * short-circuits on a redelivered webhook for a Stripe subscription it's
   * already processed, before this method is ever called a second time.
   * `referredUserId` also carries a DB-level unique index as a hard
   * backstop against ever creating a second Referral for the same person.
   */
  async recordReferralWithFirstPayment(
    referralCode: string | undefined,
    referredUserId: string,
    payment: {
      tier: BillingTier;
      billingCycle: BillingCycle;
      amount: number;
      paidAt: Date;
      subscriptionId: Types.ObjectId | string;
    }
  ): Promise<void> {
    if (!referralCode || referralCode === referredUserId) return;

    try {
      const referrer = await User.findById(referralCode);
      if (!referrer) return;

      const rewardAmount = calculateReferralReward(payment.amount);

      await Referral.create({
        referrerId: referralCode,
        referredUserId,
        status: 'REWARD_EARNED',
        referredTier: payment.tier,
        referredBillingCycle: payment.billingCycle,
        firstPaymentAmount: payment.amount,
        firstPaymentDate: payment.paidAt,
        firstPaymentSubscriptionId: payment.subscriptionId,
        rewardPercentage: REFERRAL_REWARD_PERCENTAGE,
        rewardAmount,
        qualifiedAt: payment.paidAt,
      });

      logger.info('Referral qualified from first payment', {
        referrerId: referralCode,
        referredUserId,
        firstPaymentAmount: payment.amount,
        rewardAmount,
      });
    } catch (error) {
      logger.warn('Referral not recorded', { referralCode, referredUserId, error });
    }
  }
}

export const referralService = new ReferralService();

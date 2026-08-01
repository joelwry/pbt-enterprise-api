import { Referral } from '@/modules/referrals/schemas/Referral.schema';
import { User } from '@/modules/users/schemas/User.schema';
import { config } from '@/config/environment';
import logger from '@/core/logger/logger';

/** Flat credit per successful referral -- there's no real payment/credit ledger yet (same Stripe-dependent gap noted throughout the subscriptions work), so this is tracked and displayed, not actually paid out. */
const REWARD_PER_REFERRAL = 10;

export class ReferralService {
  /** Every member's referral code is simply their own account id (already shown to them as "Client ID" everywhere else in the portal) -- no separate code to generate, store, or collide. */
  async getSummary(userId: string) {
    const totalReferrals = await Referral.countDocuments({ referrerId: userId });

    return {
      referralCode: userId,
      referralLink: `${config.FRONTEND_URL}/join?ref=${userId}`,
      totalReferrals,
      rewardsEarned: totalReferrals * REWARD_PER_REFERRAL,
      rewardPerReferralLabel: `£${REWARD_PER_REFERRAL} per successful referral`,
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
      rewardAmount: r.rewardAmount,
    }));

    return { items, totalItems };
  }

  /**
   * Called from registration -- silently no-ops on an invalid/self/duplicate
   * code rather than blocking account creation, since a referral is a bonus
   * on top of signup, never a requirement for it.
   */
  async recordReferral(referralCode: string | undefined, referredUserId: string): Promise<void> {
    if (!referralCode || referralCode === referredUserId) return;

    try {
      const referrer = await User.findById(referralCode);
      if (!referrer) return;

      await Referral.create({ referrerId: referralCode, referredUserId, rewardAmount: REWARD_PER_REFERRAL });
      logger.info('Referral recorded', { referrerId: referralCode, referredUserId });
    } catch (error) {
      // Duplicate referredUserId (already credited) or a malformed code -- either way, never fail registration over it.
      logger.warn('Referral not recorded', { referralCode, referredUserId, error });
    }
  }
}

export const referralService = new ReferralService();

import { Referral } from '@/modules/referrals/schemas/Referral.schema';
import type { ReferralStatus } from '@/modules/referrals/schemas/Referral.schema';
import { REFERRAL_STATUS_LABEL, REFERRAL_FILTER_BUCKETS, ReferralFilterKey } from '@/modules/referrals/services/referral-status';
import { TIER_LABEL } from '@/modules/pricing/services/pricing.service';
import type { BillingTier } from '@/core/payments/StripeService';
import { NotFoundError, ValidationError, ConflictError } from '@/core/errors/AppError';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function dateLabel(d?: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export class AdminReferralsService {
  async getStats() {
    const referrals = await Referral.find({});

    const totalRewardsEarned = referrals.reduce((sum, r) => sum + (r.rewardAmount ?? 0), 0);
    const totalRewardsPaid = referrals
      .filter((r) => r.status === 'PAID')
      .reduce((sum, r) => sum + (r.rewardAmount ?? 0), 0);
    const totalRewardsOutstanding = referrals
      .filter((r) => r.status === 'REWARD_EARNED' || r.status === 'PAYMENT_PENDING')
      .reduce((sum, r) => sum + (r.rewardAmount ?? 0), 0);

    return {
      totalReferrals: referrals.length,
      totalRewardsEarned: round2(totalRewardsEarned),
      totalRewardsPaid: round2(totalRewardsPaid),
      totalRewardsOutstanding: round2(totalRewardsOutstanding),
    };
  }

  async getReferrals(query: { search?: string; filter?: ReferralFilterKey; page: number; limit: number }) {
    const { search, filter, page, limit } = query;
    const dbFilter: Record<string, unknown> = {};

    if (filter && REFERRAL_FILTER_BUCKETS[filter]) {
      dbFilter.status = { $in: REFERRAL_FILTER_BUCKETS[filter] };
    }

    const [items, totalItems] = await Promise.all([
      Referral.find(dbFilter)
        .populate('referrerId', 'fullName email')
        .populate('referredUserId', 'fullName email')
        .populate('paidBy', 'fullName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Referral.countDocuments(dbFilter),
    ]);

    const mapped = items.map((r: any) => ({
      id: r._id.toString(),
      referrerName: r.referrerId?.fullName ?? 'Deleted member',
      referrerEmail: r.referrerId?.email ?? '',
      referredName: r.referredUserId?.fullName ?? 'Deleted member',
      referredEmail: r.referredUserId?.email ?? '',
      tierLabel: r.referredTier ? TIER_LABEL[r.referredTier as BillingTier] : null,
      firstPaymentAmount: r.firstPaymentAmount ?? null,
      firstPaymentDateLabel: dateLabel(r.firstPaymentDate),
      rewardPercentage: r.rewardPercentage,
      rewardAmount: r.rewardAmount ?? null,
      status: r.status as ReferralStatus,
      statusLabel: REFERRAL_STATUS_LABEL[r.status as ReferralStatus],
      paymentReference: r.paymentReference ?? null,
      adminNote: r.adminNote ?? null,
      paidByName: r.paidBy?.fullName ?? null,
      paidDateLabel: dateLabel(r.paidAt),
      createdDateLabel: dateLabel(r.createdAt),
    }));

    // Search is applied post-query against the populated names/emails --
    // referrals don't carry a searchable field of their own (same limitation
    // as the admin subscription invoices search).
    const q = search?.trim().toLowerCase();
    const filtered = q
      ? mapped.filter(
          (r) =>
            r.referrerName.toLowerCase().includes(q) ||
            r.referrerEmail.toLowerCase().includes(q) ||
            r.referredName.toLowerCase().includes(q) ||
            r.referredEmail.toLowerCase().includes(q)
        )
      : mapped;

    return { items: filtered, totalItems: q ? filtered.length : totalItems };
  }

  /** Admin has started processing an earned reward's payout. Optional step -- an admin can also go straight to markPaid(). */
  async markPaymentPending(referralId: string) {
    const referral = await Referral.findById(referralId);
    if (!referral) throw new NotFoundError('Referral not found');

    if (referral.status !== 'REWARD_EARNED') {
      throw new ValidationError(
        `Cannot mark as processing -- referral is currently "${REFERRAL_STATUS_LABEL[referral.status]}", not "Reward earned".`
      );
    }

    referral.status = 'PAYMENT_PENDING';
    await referral.save();
    return referral;
  }

  /**
   * Records that PBT has paid this referral reward externally. This never
   * moves money itself -- it's an administrative record of a payment that
   * already happened outside the portal (bank transfer, etc).
   */
  async markPaid(referralId: string, adminUserId: string, input: { paymentReference?: string; adminNote?: string }) {
    const referral = await Referral.findById(referralId);
    if (!referral) throw new NotFoundError('Referral not found');

    if (referral.status === 'PAID') {
      throw new ConflictError('This referral reward has already been marked as paid.');
    }

    if (referral.status !== 'REWARD_EARNED' && referral.status !== 'PAYMENT_PENDING') {
      throw new ValidationError(
        `Cannot mark as paid -- referral is currently "${REFERRAL_STATUS_LABEL[referral.status]}", not yet an earned reward.`
      );
    }

    referral.status = 'PAID';
    referral.paidAt = new Date();
    referral.paidBy = adminUserId as any;
    if (input.paymentReference !== undefined) referral.paymentReference = input.paymentReference;
    if (input.adminNote !== undefined) referral.adminNote = input.adminNote;

    await referral.save();
    return referral;
  }
}

export const adminReferralsService = new AdminReferralsService();

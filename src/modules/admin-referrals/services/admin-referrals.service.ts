import { Referral } from '@/modules/referrals/schemas/Referral.schema';

export class AdminReferralsService {
  async getStats() {
    const [totalReferrals, rewardAgg] = await Promise.all([
      Referral.countDocuments({}),
      Referral.aggregate([{ $group: { _id: null, total: { $sum: '$rewardAmount' } } }]),
    ]);

    return {
      totalReferrals,
      totalRewardsIssued: rewardAgg[0]?.total ?? 0,
    };
  }

  async getReferrals(query: { search?: string; page: number; limit: number }) {
    const { search, page, limit } = query;
    const filter = {};

    const [items, totalItems] = await Promise.all([
      Referral.find(filter)
        .populate('referrerId', 'fullName email')
        .populate('referredUserId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Referral.countDocuments(filter),
    ]);

    const mapped = items.map((r: any) => ({
      id: r._id.toString(),
      referrerName: r.referrerId?.fullName ?? 'Deleted member',
      referrerEmail: r.referrerId?.email ?? '',
      referredName: r.referredUserId?.fullName ?? 'Deleted member',
      referredEmail: r.referredUserId?.email ?? '',
      rewardAmount: r.rewardAmount,
      dateLabel: r.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
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
}

export const adminReferralsService = new AdminReferralsService();

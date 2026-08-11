import { subscriptionService } from '@/modules/subscriptions/services/subscription.service';
import { Subscription } from '@/modules/subscriptions/schemas/Subscription.schema';
import { Leader } from '@/modules/leaders/schemas/Leader.schema';
import { User } from '@/modules/users/schemas/User.schema';
import { NotFoundError, AppError } from '@/core/errors/AppError';

function toTierLabel(tier: 'pathway' | 'plus' | 'mentorship'): 'Pathway' | 'Plus' | 'Mentorship' {
  return (tier.charAt(0).toUpperCase() + tier.slice(1)) as 'Pathway' | 'Plus' | 'Mentorship';
}

function initialsOf(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export class AdminSubscriptionsService {
  async getStats() {
    return subscriptionService.getAdminStats();
  }

  async getRevenueByTier() {
    const revenue = await subscriptionService.getRevenueByTier();
    return {
      mrrLabel: revenue.mrrLabel,
      segments: revenue.segments.map((s) => ({ ...s, tier: toTierLabel(s.tier.toLowerCase() as any) })),
    };
  }

  /**
   * Real invoices are always "Paid" (no payment gateway to fail/refund yet —
   * see the Stripe follow-up in the progress log). A status filter for
   * Failed/Refunded is honestly answered with an empty page rather than
   * fabricated rows.
   */
  async getInvoices(query: { status?: string; search?: string; page: number; limit: number }) {
    if (query.status && query.status !== 'All' && query.status !== 'Paid') {
      return { items: [], totalItems: 0 };
    }

    const { items, totalItems } = await subscriptionService.getAdminInvoices({
      search: query.search,
      page: query.page,
      limit: query.limit,
    });

    const mapped = items.map((sub: any) => ({
      id: sub._id.toString(),
      invoiceNumber: `INV-${sub.createdAt.getFullYear()}-${sub._id.toString().slice(-6).toUpperCase()}`,
      memberName: sub.userId?.fullName ?? 'Unknown member',
      memberInitials: sub.userId?.fullName ? initialsOf(sub.userId.fullName) : '?',
      tier: toTierLabel(sub.tier),
      amount: sub.amount,
      dateLabel: sub.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'Paid' as const,
    }));

    return { items: mapped, totalItems };
  }

  /**
   * Mentorship-tier members, for the "Assign Mentor" admin control -- each
   * row is a real active Mentorship subscription joined with the member's
   * current assignedLeader (if any), so an admin can see who still needs a
   * mentor without a full admin-members build-out.
   */
  async getMentorshipMembers(page: number, limit: number) {
    const filter: Record<string, unknown> = { tier: 'mentorship', status: 'active', endDate: { $gt: new Date() } };
    const [subs, totalItems] = await Promise.all([
      Subscription.find(filter)
        .populate('userId', 'fullName email assignedLeader')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Subscription.countDocuments(filter),
    ]);

    const leaderIds = subs.map((s: any) => s.userId?.assignedLeader).filter(Boolean);
    const leaders = leaderIds.length ? await Leader.find({ _id: { $in: leaderIds } }) : [];
    const leaderById = new Map(leaders.map((l) => [l._id.toString(), l]));

    const items = subs.map((sub: any) => {
      const user = sub.userId;
      const leader = user?.assignedLeader ? leaderById.get(user.assignedLeader) : undefined;
      return {
        userId: user?._id?.toString() ?? '',
        memberName: user?.fullName ?? 'Unknown member',
        memberEmail: user?.email ?? '',
        assignedLeaderId: leader?._id?.toString() ?? null,
        assignedLeaderName: leader?.fullName ?? null,
      };
    });

    return { items, totalItems };
  }

  async assignMentor(userId: string, leaderId: string | null) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('Member not found');
    }

    if (leaderId) {
      const leader = await Leader.findOne({ _id: leaderId, isActive: true });
      if (!leader) {
        throw new AppError(400, 'Selected leader is not available', ['ERR_3002']);
      }
      user.assignedLeader = leaderId;
    } else {
      user.assignedLeader = undefined;
    }

    await user.save();
    return { userId: user._id.toString(), assignedLeader: user.assignedLeader ?? null };
  }
}

export const adminSubscriptionsService = new AdminSubscriptionsService();

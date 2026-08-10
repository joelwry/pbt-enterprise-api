import { MentorshipCall } from '@/modules/membership-benefits/schemas/MentorshipCall.schema';
import { User } from '@/modules/users/schemas/User.schema';
import { Leader } from '@/modules/leaders/schemas/Leader.schema';
import { subscriptionService } from '@/modules/subscriptions/services/subscription.service';
import { AppError, NotFoundError } from '@/core/errors/AppError';

/** Editorial copy for the Mentorship page -- not per-user data, so it stays static here rather than admin-authored (same call as the PBT Plus marketing page). */
const MENTORSHIP_BENEFITS = [
  { id: 'b1', title: 'Monthly 1:1 Masterplan Calls', description: '45-minute sessions with your assigned Leader, booked directly from your dashboard.' },
  { id: 'b2', title: 'Early Access to New Releases', description: 'See new modules and toolkits before they reach Pathway and Plus members.' },
  { id: 'b3', title: 'Personalised Portfolio Review', description: 'Quarterly review of your deal pipeline and growth targets.' },
  { id: 'b4', title: 'Masterplan Circle Community', description: 'A smaller, closed discussion group exclusive to Masterplan Programme members.' },
];

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export class MembershipBenefitsService {
  /**
   * Resolves the Mentorship page for a member who already has Mentorship-tier
   * access (the route enforces the tier gate before calling this).
   * assignedMentor is null until an admin assigns one via
   * admin-subscriptions -- an honest empty state, not a fabricated mentor.
   */
  async getMentorshipPage(userId: string) {
    const [user, subscription] = await Promise.all([
      User.findById(userId),
      subscriptionService.getCurrentSubscription(userId),
    ]);

    if (!user) {
      throw new NotFoundError('Member not found');
    }

    const leader = user.assignedLeader ? await Leader.findOne({ _id: user.assignedLeader, isActive: true }) : null;

    return {
      tagline: 'Your Active Plan',
      headline: 'PBT Masterplan Programme — 1:1 guidance from a dedicated Leader.',
      description:
        'Everything in PBT Plus, plus monthly 1:1 mentorship calls, direct message access to your assigned Leader, and early access to new programme releases.',
      renewsLabel: subscription ? formatDateLabel(subscription.endDate) : '—',
      benefits: MENTORSHIP_BENEFITS,
      assignedMentor: leader
        ? {
            name: leader.fullName,
            initials: leader.fullName
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]!.toUpperCase())
              .join(''),
            regionLabel: `PBT Leader · ${leader.location || leader.region}`,
            badgeLabel: leader.isTopMentor ? 'Top Mentor' : leader.specialty,
          }
        : null,
    };
  }

  async getCalls(userId: string, page: number, limit: number) {
    const filter = { memberId: userId };
    const [calls, totalItems] = await Promise.all([
      MentorshipCall.find(filter)
        .populate('leaderId', 'fullName')
        .sort({ scheduledAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      MentorshipCall.countDocuments(filter),
    ]);

    const items = calls.map((call: any) => ({
      id: call._id.toString(),
      dateLabel: call.scheduledAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ', ' +
        call.scheduledAt.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }),
      topic: call.topic,
      mentorName: call.leaderId?.fullName ?? 'Unassigned',
      status: call.status.charAt(0).toUpperCase() + call.status.slice(1),
    }));

    return { items, totalItems };
  }

  async bookCall(userId: string, input: { topic: string; scheduledAt: Date }) {
    const user = await User.findById(userId);
    if (!user?.assignedLeader) {
      throw new AppError(400, "You don't have a mentor assigned yet — contact your PBT account manager", ['ERR_3003']);
    }

    const leader = await Leader.findOne({ _id: user.assignedLeader, isActive: true });
    if (!leader) {
      throw new AppError(400, 'Your assigned mentor is currently unavailable — contact your PBT account manager', ['ERR_3003']);
    }

    const call = await MentorshipCall.create({
      memberId: userId,
      leaderId: leader._id,
      topic: input.topic,
      scheduledAt: input.scheduledAt,
      status: 'scheduled',
    });

    return {
      id: call._id.toString(),
      dateLabel: call.scheduledAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ', ' +
        call.scheduledAt.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }),
      topic: call.topic,
      mentorName: leader.fullName,
      status: 'Scheduled',
    };
  }
}

export const membershipBenefitsService = new MembershipBenefitsService();

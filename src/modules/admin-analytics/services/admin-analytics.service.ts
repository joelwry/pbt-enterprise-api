import { User } from '@/modules/users/schemas/User.schema';
import { Subscription } from '@/modules/subscriptions/schemas/Subscription.schema';
import { Lesson, UserLessonProgress } from '@/modules/learning/schemas/Learning.schema';
import { UserProgress } from '@/modules/progress/schemas/UserProgress.schema';
import { Event } from '@/modules/events/schemas/Event.schema';
import { adminMembersService } from '@/modules/admin-members/services/admin-members.service';

type FrontendTier = 'Pathway' | 'Plus' | 'Mentorship';
const TIER_FRONTEND: Record<string, FrontendTier> = { pathway: 'Pathway', plus: 'Plus', mentorship: 'Mentorship' };

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export class AdminAnalyticsService {
  /**
   * Every figure here is a real aggregate -- no fabricated percentages.
   * `membershipGrowthPercent` compares this calendar month's new member
   * signups to last month's (0 when there's no prior-month baseline to
   * compare against, rather than a divide-by-zero or a made-up number).
   */
  async getStats() {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [memberStats, thisMonthSignups, lastMonthSignups, progressDocs, events] = await Promise.all([
      adminMembersService.getStats(),
      User.countDocuments({ role: 'member', createdAt: { $gte: thisMonthStart } }),
      User.countDocuments({ role: 'member', createdAt: { $gte: lastMonthStart, $lt: thisMonthStart } }),
      UserProgress.find().select('overallProgress'),
      Event.find({ isActive: true }).select('rsvps capacity').lean(),
    ]);

    const contentCompletionPercent = progressDocs.length
      ? Math.round(progressDocs.reduce((sum, p) => sum + p.overallProgress, 0) / progressDocs.length)
      : 0;

    const eventsWithCapacity = events.filter((e) => e.capacity > 0);
    const eventAttendancePercent = eventsWithCapacity.length
      ? Math.round(
          (eventsWithCapacity.reduce((sum, e) => sum + e.rsvps.length / e.capacity, 0) / eventsWithCapacity.length) * 100
        )
      : 0;

    const membershipGrowthPercent = lastMonthSignups > 0 ? Math.round(((thisMonthSignups - lastMonthSignups) / lastMonthSignups) * 100) : 0;

    return {
      activeMembers: memberStats.totalMembers,
      activeMembersDeltaLabel: memberStats.totalMembersDeltaLabel,
      contentCompletionPercent,
      eventAttendancePercent,
      membershipGrowthPercent,
    };
  }

  /** Real signups per calendar month, oldest to newest, for the last 6 months (this one included). */
  async getMemberGrowth() {
    const now = new Date();
    const months: { start: Date; end: Date; monthLabel: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({ start, end, monthLabel: start.toLocaleDateString('en-GB', { month: 'short' }) });
    }

    const earliestStart = months[0]!.start;
    const signups = await User.find({ role: 'member', createdAt: { $gte: earliestStart } }).select('createdAt');
    const countByMonth = new Map<string, number>();
    for (const user of signups) {
      const key = monthKey(user.createdAt);
      countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1);
    }

    return months.map((m) => ({ monthLabel: m.monthLabel, newMembers: countByMonth.get(monthKey(m.start)) ?? 0 }));
  }

  /** Real tier distribution over currently-active subscriptions -- same computation as the admin dashboard's membership breakdown. */
  async getMembersByTier() {
    const now = new Date();
    const activeSubs = await Subscription.find({ status: 'active', endDate: { $gt: now } }).select('tier');
    const tierCounts = { pathway: 0, plus: 0, mentorship: 0 };
    for (const sub of activeSubs) tierCounts[sub.tier as keyof typeof tierCounts]++;
    const total = activeSubs.length || 1;

    return {
      totalMembers: activeSubs.length,
      segments: (['pathway', 'plus', 'mentorship'] as const).map((tier) => ({
        tier: TIER_FRONTEND[tier],
        percent: Math.round((tierCounts[tier] / total) * 100),
      })),
    };
  }

  /** Top published lessons by real completion rate (completions / total members). */
  async getContentEngagement() {
    const totalMembers = await User.countDocuments({ role: 'member' });
    if (totalMembers === 0) return [];

    const lessons = await Lesson.find({ isDraft: { $ne: true } }).select('title');
    const completions = await UserLessonProgress.aggregate<{ _id: string; count: number }>([
      { $match: { status: 'completed' } },
      { $group: { _id: '$lessonId', count: { $sum: 1 } } },
    ]);
    const completionByLesson = new Map(completions.map((c) => [c._id.toString(), c.count]));

    return lessons
      .map((lesson) => ({
        title: lesson.title,
        completionPercent: Math.round(((completionByLesson.get(lesson._id.toString()) ?? 0) / totalMembers) * 100),
      }))
      .filter((item) => item.completionPercent > 0)
      .sort((a, b) => b.completionPercent - a.completionPercent)
      .slice(0, 5);
  }

  /** Real RSVP counts across active events, grouped by category. */
  async getEventAttendance() {
    const events = await Event.find({ isActive: true }).select('category rsvps').lean();
    const attendeesByCategory = new Map<string, number>();
    for (const event of events) {
      attendeesByCategory.set(event.category, (attendeesByCategory.get(event.category) ?? 0) + event.rsvps.length);
    }

    return [...attendeesByCategory.entries()]
      .map(([eventLabel, attendeeCount]) => ({ eventLabel, attendeeCount }))
      .sort((a, b) => b.attendeeCount - a.attendeeCount);
  }
}

export const adminAnalyticsService = new AdminAnalyticsService();

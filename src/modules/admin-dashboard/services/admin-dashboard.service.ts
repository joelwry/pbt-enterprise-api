import { User } from '@/modules/users/schemas/User.schema';
import { Subscription } from '@/modules/subscriptions/schemas/Subscription.schema';
import { Lesson, Module } from '@/modules/learning/schemas/Learning.schema';
import { CommunityThread } from '@/modules/community/schemas/Community.schema';
import { Event } from '@/modules/events/schemas/Event.schema';
import { subscriptionService } from '@/modules/subscriptions/services/subscription.service';
import { adminMembersService, resolveTierAndStatus, mostRecentSubscriptionsFor } from '@/modules/admin-members/services/admin-members.service';
import { adminLearningService } from '@/modules/admin-learning/services/admin-learning.service';
import { adminCommunityService } from '@/modules/admin-community/services/admin-community.service';

const TIER_LABEL: Record<string, string> = { pathway: 'PBT Pathway', plus: 'PBT Plus', mentorship: 'PBT Masterplan Programme' };
const TIER_FRONTEND: Record<string, 'Pathway' | 'Plus' | 'Mentorship'> = { pathway: 'Pathway', plus: 'Plus', mentorship: 'Mentorship' };

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
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

export class AdminDashboardService {
  /**
   * Composes the admin dashboard entirely from real aggregates over
   * existing collections, reusing the same stats services the dedicated
   * admin screens (Members, Learning, Community, Subscriptions) already
   * use, rather than re-deriving these numbers a second way. Every count
   * shown is a real query -- nothing here is placeholder/mock data.
   */
  async getDashboard(adminUserId: string) {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      admin,
      memberStats,
      subStats,
      revenueByTier,
      learningStats,
      communityStats,
      communityPostsToday,
      recentUsers,
      allActiveSubs,
      flaggedThreads,
      lessonsUnlockingThisWeek,
      upcomingLessons,
      nearCapacityEvents,
    ] = await Promise.all([
      User.findById(adminUserId),
      adminMembersService.getStats(),
      subscriptionService.getAdminStats(),
      subscriptionService.getRevenueByTier(),
      adminLearningService.getStats(),
      adminCommunityService.getStats(),
      CommunityThread.countDocuments({ createdAt: { $gte: todayStart } }),
      User.find({ role: 'member' }).sort({ createdAt: -1 }).limit(3),
      Subscription.find({ status: 'active', endDate: { $gt: now } }).select('userId tier'),
      CommunityThread.find({ reportCount: { $gt: 0 } }).sort({ reportCount: -1 }).limit(1),
      Lesson.countDocuments({ isDraft: { $ne: true }, 'access.unlocksAt': { $gte: now, $lte: weekFromNow } }),
      Lesson.find({ isDraft: { $ne: true }, 'access.unlocksAt': { $gt: now } })
        .sort({ 'access.unlocksAt': 1 })
        .limit(3),
      Event.find({ date: { $gte: now }, isActive: true }).select('title rsvps capacity date').lean(),
    ]);

    // --- Membership breakdown: real tier distribution over active subscriptions.
    const tierCounts = { pathway: 0, plus: 0, mentorship: 0 };
    for (const sub of allActiveSubs) tierCounts[sub.tier as keyof typeof tierCounts]++;
    const totalActive = allActiveSubs.length || 1; // avoid div-by-zero when the DB is empty
    const membershipBreakdown = {
      totalMembers: allActiveSubs.length,
      yearLabel: String(now.getFullYear()),
      segments: (['pathway', 'plus', 'mentorship'] as const).map((tier) => ({
        tier: TIER_FRONTEND[tier],
        label: TIER_LABEL[tier],
        percent: Math.round((tierCounts[tier] / totalActive) * 100),
      })),
    };

    // --- Recently joined: last 3 members with their real tier/status --
    // reuses the exact same lapsed-subscription-aware logic as the Members
    // list (mostRecentSubscriptionsFor + resolveTierAndStatus) so a member
    // whose subscription already expired doesn't silently show as Pathway/Active here.
    const recentSubs = await mostRecentSubscriptionsFor(recentUsers.map((u) => u._id));
    const recentlyJoined = recentUsers.map((u) => {
      const { tier, status } = resolveTierAndStatus(u, recentSubs.get(u._id.toString()) ?? null);
      return {
        id: u._id.toString(),
        fullName: u.fullName,
        initials: initialsOf(u.fullName),
        email: u.email,
        tier,
        joinedLabel: u.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        status,
      };
    });

    // --- Needs attention: only real, currently-true conditions. No item is
    // fabricated -- an empty array here is the honest result when nothing
    // actually needs attention.
    const needsAttention: { id: string; icon: 'flag' | 'payment' | 'event'; title: string; subtitle: string; href: string }[] = [];
    if (communityStats.flaggedCount > 0) {
      needsAttention.push({
        id: 'att_flagged',
        icon: 'flag',
        title: `${communityStats.flaggedCount} community post${communityStats.flaggedCount === 1 ? '' : 's'} flagged for review`,
        subtitle: 'Community moderation queue',
        href: '/admin/community',
      });
    }
    if (subStats.failedPaymentsCount > 0) {
      needsAttention.push({
        id: 'att_failed_payment',
        icon: 'payment',
        title: `${subStats.failedPaymentsCount} failed payment${subStats.failedPaymentsCount === 1 ? '' : 's'}`,
        subtitle: 'Subscriptions & Billing',
        href: '/admin/subscriptions',
      });
    }
    const nearCapacity = nearCapacityEvents.find((e) => e.capacity > 0 && e.rsvps.length / e.capacity >= 0.8);
    if (nearCapacity) {
      needsAttention.push({
        id: 'att_event_capacity',
        icon: 'event',
        title: `${nearCapacity.title} — ${nearCapacity.rsvps.length} RSVPs, capacity ${nearCapacity.capacity}`,
        subtitle: 'Events',
        href: '/admin/events',
      });
    }

    // --- Upcoming unlocks: real scheduled lessons, soonest first.
    const upcomingModuleIds = [...new Set(upcomingLessons.map((l) => l.moduleId.toString()))];
    const upcomingModules = await Module.find({ _id: { $in: upcomingModuleIds } });
    const moduleById = new Map(upcomingModules.map((m) => [m._id.toString(), m]));
    const upcomingUnlocks = upcomingLessons.map((lesson) => {
      const mod = moduleById.get(lesson.moduleId.toString());
      const unlocksAt = lesson.access.unlocksAt!;
      return {
        id: lesson._id.toString(),
        day: unlocksAt.toLocaleDateString('en-GB', { day: '2-digit' }),
        month: unlocksAt.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
        title: lesson.title,
        moduleLabel: mod ? `Module ${mod.moduleNumber} · ${mod.title}` : 'Unassigned module',
        badgeLabel: 'Scheduled',
      };
    });

    return {
      adminFirstName: admin ? firstNameOf(admin.fullName) : 'Admin',
      stats: {
        activeMembers: memberStats.totalMembers,
        activeMembersDeltaLabel: memberStats.totalMembersDeltaLabel,
        mrrLabel: revenueByTier.mrrLabel,
        mrrDeltaLabel: subStats.mrrDeltaLabel,
        lessonsPublished: learningStats.publishedCount,
        lessonsPublishedYearLabel: `Lessons Published (${yearStart.getFullYear()})`,
        lessonsUnlockThisWeekLabel: `${lessonsUnlockingThisWeek} unlock${lessonsUnlockingThisWeek === 1 ? 's' : ''} this week`,
        communityPosts: communityStats.totalPosts,
        communityPostsTodayLabel: `${communityPostsToday} today`,
      },
      membershipBreakdown,
      recentlyJoined,
      needsAttention,
      upcomingUnlocks,
    };
  }
}

export const adminDashboardService = new AdminDashboardService();

import { User } from '@/modules/users/schemas/User.schema';
import { Lesson, UserLessonProgress } from '@/modules/learning/schemas/Learning.schema';
import { Event } from '@/modules/events/schemas/Event.schema';
import { CommunityThread } from '@/modules/community/schemas/Community.schema';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Backend lesson type uses 'PDF'; the frontend's file-download lessons are
// labelled 'Download' — everything else maps through unchanged.
function toFrontendLessonType(type: string): 'Video' | 'Article' | 'Download' | 'Quiz' {
  return type === 'PDF' ? 'Download' : (type as 'Video' | 'Article' | 'Quiz');
}

function daysAgoLabel(date: Date, now: Date): string {
  const days = Math.floor((now.getTime() - date.getTime()) / DAY_MS);
  if (days <= 0) return 'Unlocked today';
  if (days === 1) return 'Unlocked yesterday';
  return `Unlocked ${days} days ago`;
}

function timeAgoLabel(date: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function encouragementFor(percent: number): string {
  if (percent >= 75) return "You're almost there — keep up the great work!";
  if (percent >= 40) return "Keep going! You're doing excellent.";
  if (percent > 0) return 'Great start — keep building momentum.';
  return 'Start your first lesson to begin your journey.';
}

const QUICK_ACCESS = [
  { id: 'qa_learning', label: 'PBT Pathway', description: 'Browse this year', href: '/pbt-pathway', icon: 'learning' as const },
  { id: 'qa_resources', label: 'Resource Library', description: 'Templates & guides', href: '/resources', icon: 'resources' as const },
  { id: 'qa_community', label: 'Community Group', description: 'Join discussions', href: '/community', icon: 'community' as const },
  { id: 'qa_events', label: 'Events', description: 'Upcoming sessions', href: '/events', icon: 'events' as const },
];

export class DashboardService {
  async buildDashboard(userId: string) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - WEEK_MS);

    const workshopFilter = {
      date: { $gte: now },
      isActive: true,
      category: { $in: ['Masterclass', 'Mentorship'] as const },
    };

    const [user, allProgressRecords, allLessons, upcomingEvents, recentThreads, nextWorkshop, upcomingWorkshopsCount] =
      await Promise.all([
        User.findById(userId),
        UserLessonProgress.find({ userId }),
        // Scoped to Pathway-tier lessons only -- every subscribed member,
        // regardless of their own tier, can access the shared PBT Pathway
        // roadmap (see canAccessLesson), and that's the "X% Roadmap"
        // progress this dashboard widget mirrors. Previously fetched every
        // lesson of every tier here, so a Pathway member's progress % was
        // computed against a denominator that included Plus/Mentorship
        // lessons they could never complete -- silently deflating their
        // percentage and disagreeing with the PBT Pathway page's own
        // (correctly tier-scoped) number for the exact same roadmap.
        Lesson.find({ isDraft: { $ne: true }, 'access.requiredTier': 'Pathway' }).sort({ 'access.unlocksAt': 1 }),
        Event.find({ date: { $gte: now }, isActive: true }).sort({ date: 1 }).limit(3),
        CommunityThread.find({}).sort({ createdAt: -1 }).limit(3),
        Event.findOne(workshopFilter).sort({ date: 1 }),
        Event.countDocuments(workshopFilter),
      ]);

    // ---- Stats: total learning effort across every tier the member has
    // touched (Pathway + any dedicated Plus/Masterplan lessons) -- unlike
    // roadmapProgress below, this is a whole-platform summary, not scoped
    // to one roadmap, so it intentionally still uses every progress record.
    const completedRecords = allProgressRecords.filter((p) => p.status === 'completed');
    const lessonsCompleted = completedRecords.length;
    const lessonsCompletedThisWeek = completedRecords.filter(
      (p) => p.completedAt && p.completedAt >= weekAgo
    ).length;

    const totalMinutes = allProgressRecords.reduce((sum, p) => sum + (p.timeSpentMinutes || 0), 0);
    const minutesThisWeek = allProgressRecords
      .filter((p) => p.lastAccessedAt && p.lastAccessedAt >= weekAgo)
      .reduce((sum, p) => sum + (p.timeSpentMinutes || 0), 0);

    // ---- Roadmap progress -- scoped to the Pathway-tier lessons fetched
    // above, matching exactly what the PBT Pathway page itself computes for
    // the same roadmap (see learning.service.ts getModuleProgress/tier).
    const pathwayLessonIds = new Set(allLessons.map((l) => l._id.toString()));
    const progressRecords = allProgressRecords.filter((p) => pathwayLessonIds.has(p.lessonId.toString()));
    const lessonsCompletedInRoadmap = progressRecords.filter((p) => p.status === 'completed').length;
    const inProgressRecords = progressRecords.filter((p) => p.status === 'in-progress');

    const contentUnlocked = allLessons.filter((l) => l.access.unlocksAt <= now).length;
    const contentUnlockedTotal = allLessons.length;
    const nextLesson = allLessons.find((l) => l.access.unlocksAt > now);
    const nextUnlockInDays = nextLesson
      ? Math.max(0, Math.ceil((nextLesson.access.unlocksAt.getTime() - now.getTime()) / DAY_MS))
      : 0;

    const stats = {
      lessonsCompleted,
      lessonsCompletedDeltaLabel:
        lessonsCompletedThisWeek > 0 ? `+${lessonsCompletedThisWeek} this week` : 'No new lessons this week',
      studyHours: Math.round((totalMinutes / 60) * 10) / 10,
      studyHoursDeltaLabel:
        minutesThisWeek > 0 ? `+${Math.round((minutesThisWeek / 60) * 10) / 10} this week` : 'No study time this week',
      contentUnlocked,
      contentUnlockedTotal,
      nextUnlockInDays,
      nextUnlockLabel: nextLesson ? nextLesson.title : 'No upcoming unlocks',
    };

    const overallPercent = contentUnlockedTotal > 0 ? Math.round((lessonsCompletedInRoadmap / contentUnlockedTotal) * 100) : 0;
    const roadmapProgress = {
      overallPercent,
      encouragement: encouragementFor(overallPercent),
      completed: lessonsCompletedInRoadmap,
      unlockedInProgress: inProgressRecords.length,
      upcoming: Math.max(contentUnlockedTotal - lessonsCompletedInRoadmap - inProgressRecords.length, 0),
      totalThisYear: contentUnlockedTotal,
      roadmapLabel: `${now.getFullYear()} Roadmap`,
    };

    // ---- Continue learning ----
    const mostRecentInProgress = [...inProgressRecords].sort(
      (a, b) => (b.lastAccessedAt?.getTime() || 0) - (a.lastAccessedAt?.getTime() || 0)
    )[0];
    let continueLearning = null;
    if (mostRecentInProgress) {
      const lesson = allLessons.find((l) => l._id.toString() === mostRecentInProgress.lessonId.toString());
      if (lesson) {
        continueLearning = {
          id: lesson._id.toString(),
          category: lesson.category,
          title: lesson.title,
          type: toFrontendLessonType(lesson.type),
          unlockedLabel: daysAgoLabel(lesson.access.unlocksAt, now),
          availabilityLabel: 'Available until next unlock',
          progressPercent: mostRecentInProgress.progressPercent,
          timeLeftLabel: `${Math.max(100 - mostRecentInProgress.progressPercent, 0)}% remaining`,
        };
      }
    }

    return {
      memberFirstName: user?.fullName?.split(' ')[0] ?? 'Member',
      stats,
      roadmapProgress,
      continueLearning,
      quickAccess: QUICK_ACCESS,
      upcomingEvents: upcomingEvents.map((event) => ({
        id: event._id.toString(),
        day: event.date.toLocaleDateString('en-GB', { day: '2-digit' }),
        month: event.date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
        title: event.title,
        timeLabel: event.timeLabel,
        format: event.category === 'Masterclass' || event.category === 'Mentorship' ? 'Workshop' : event.category === 'In-Person' ? 'In-Person' : 'Live Online',
      })),
      communityActivity: recentThreads.map((thread) => ({
        id: thread._id.toString(),
        authorName: thread.isPinned ? 'New announcement' : 'Community member',
        message: thread.content.length > 80 ? `${thread.content.slice(0, 80)}…` : thread.content,
        timeAgoLabel: timeAgoLabel(thread.createdAt, now),
        kind: thread.isPinned ? ('announcement' as const) : ('post' as const),
      })),
      workshopsPromo: {
        upcomingCount: upcomingWorkshopsCount,
        nextWorkshopTitle: nextWorkshop?.title ?? null,
        nextWorkshopDateLabel: nextWorkshop
          ? nextWorkshop.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
          : null,
        requiredTier: nextWorkshop?.requiredTier ?? 'Plus',
      },
    };
  }

  async getSummary(userId: string) {
    const dashboard = await this.buildDashboard(userId);
    return {
      continueLearning: dashboard.continueLearning,
      upcomingEvents: dashboard.upcomingEvents,
      stats: dashboard.stats,
    };
  }
}

export default new DashboardService();

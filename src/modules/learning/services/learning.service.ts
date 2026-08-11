import {
  Lesson,
  Module,
  UserLessonProgress,
  ILesson,
  IModule,
  IUserLessonProgress,
  LessonStatus,
  MembershipTier,
} from '@/modules/learning/schemas/Learning.schema';
import { Roadmap } from '@/modules/learning/schemas/Roadmap.schema';
import { RoadmapWeek } from '@/modules/learning/schemas/RoadmapWeek.schema';
import { learningProgressService } from '@/modules/learning/services/learning-progress.service';
import { UserProgress } from '@/modules/progress/schemas/UserProgress.schema';
import activityService from '@/modules/activity/services/activity.service';
import { subscriptionService } from '@/modules/subscriptions/services/subscription.service';
import { NotFoundError, AuthorizationError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

const TIER_RANK: Record<MembershipTier, number> = { Pathway: 1, Plus: 2, Mentorship: 3 };

// How many years back from the current year members can browse in My
// Learning (inclusive of the current year). Per product direction: never
// show a future-dated roadmap to members, even if the admin has already
// created one ahead of time for planning purposes.
const VISIBLE_YEARS_BACK = 2;

export class LearningService {
  /**
   * Available roadmap years for the member-facing My Learning year picker.
   * Only the current year and up to VISIBLE_YEARS_BACK years before it are
   * shown — never a future year, regardless of what roadmaps already exist
   * in the database (admins may pre-create next year's roadmap in advance).
   */
  async getRoadmapYears() {
    const currentYear = new Date().getFullYear();
    const oldestVisibleYear = currentYear - VISIBLE_YEARS_BACK;

    const roadmaps = await Roadmap.find().sort({ year: -1 }).select('year title isCurrent');
    return roadmaps.filter((r) => {
      const year = parseInt(r.year, 10);
      return !Number.isNaN(year) && year <= currentYear && year >= oldestVisibleYear;
    });
  }

  /**
   * Lesson access has two independent gates: the Release Gate (unlocksAt)
   * and the Tier Gate (requiredTier). Per docs/ui_adjustment.md, every
   * lesson genuinely built for the general Roadmap/My Learning is tagged
   * requiredTier: 'Pathway' — the lowest tier, so every real subscriber
   * passes the tier check there for free; that's what makes My Learning
   * "available to every subscription tier" in practice. The dedicated PBT
   * Plus / PBT Masterplan learning areas reuse these same endpoints with
   * higher-tier lessons, so the tier check must still run for those, or a
   * Pathway member who obtains a Plus/Masterplan lesson's id (e.g. from a
   * network request) can fetch its full body directly, bypassing the
   * paywall entirely -- list endpoints filtered by tier, but this one
   * didn't, until now.
   */
  isLessonUnlocked(lesson: ILesson): boolean {
    return new Date() >= lesson.access.unlocksAt;
  }

  async canAccessLesson(userId: string, lesson: ILesson): Promise<boolean> {
    if (!this.isLessonUnlocked(lesson)) return false;

    const requiredTier = lesson.access.requiredTier;
    if (!requiredTier || requiredTier === 'Pathway') return true;

    const subscription = await subscriptionService.getCurrentSubscription(userId);
    if (!subscription || !subscriptionService.isSubscriptionValid(subscription)) return false;

    const memberTier = (subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)) as MembershipTier;
    return (TIER_RANK[memberTier] ?? 0) >= TIER_RANK[requiredTier];
  }

  async getUserLessonProgress(userId: string, lessonId: string): Promise<IUserLessonProgress | null> {
    return UserLessonProgress.findOne({ userId, lessonId });
  }

  async updateLessonProgress(
    userId: string,
    lessonId: string,
    moduleId: string,
    status: LessonStatus,
    progressPercent: number = 0,
    quizScore?: number,
    timeSpentMinutes: number = 0
  ): Promise<IUserLessonProgress> {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson || lesson.isDraft) throw new NotFoundError('Lesson not found');
    if (!(await this.canAccessLesson(userId, lesson))) {
      throw new AuthorizationError('You do not have access to this lesson');
    }

    let progress = await UserLessonProgress.findOne({ userId, lessonId });
    const wasAlreadyCompleted = progress?.status === 'completed';

    if (!progress) {
      progress = new UserLessonProgress({
        userId,
        lessonId,
        moduleId,
        status,
        progressPercent,
        quizScore,
        timeSpentMinutes: Math.max(0, timeSpentMinutes),
        lastAccessedAt: new Date(),
      });
    } else {
      progress.status = status;
      progress.progressPercent = progressPercent;
      if (quizScore !== undefined) progress.quizScore = quizScore;
      // Accumulated, not overwritten — a member typically reaches "completed"
      // across more than one visit to the lesson.
      if (timeSpentMinutes > 0) {
        progress.timeSpentMinutes = (progress.timeSpentMinutes || 0) + timeSpentMinutes;
      }
      progress.lastAccessedAt = new Date();

      if (status === 'completed' && !progress.completedAt) {
        progress.completedAt = new Date();
      }
    }

    const saved = await progress.save();
    logger.info(`Lesson progress updated: ${userId} - ${lessonId} - ${status}`);

    // UserLessonProgress is the write; UserProgress is always a
    // recalculation of it, never written directly.
    await learningProgressService.recalculate(userId);

    // Real activity feed entry (powers the admin member detail Activity Log)
    // -- only on the transition into "completed", not every progress tick.
    if (status === 'completed' && !wasAlreadyCompleted) {
      const lesson = await Lesson.findById(lessonId).select('title');
      await activityService.logActivity(userId, 'lesson_completed', {
        itemId: lessonId,
        itemType: 'lesson',
        description: `Completed lesson "${lesson?.title ?? 'Untitled lesson'}"`,
      });
    }

    return saved;
  }

  async getModuleProgress(userId: string, moduleId: string, tier?: MembershipTier) {
    // Denominator must be the module's actual lesson count, not the count of
    // progress records that happen to exist — most lessons have no record
    // until a member first opens them, which would otherwise inflate the %.
    // When scoped to a tier (the Pathway page, or a dedicated Plus/Masterplan
    // page), both the denominator and the completed count must be scoped to
    // that same set of lessons -- otherwise a lesson from a different tier
    // could inflate "completed" without being part of "total".
    const lessonFilter: Record<string, unknown> = { moduleId, isDraft: { $ne: true } };
    if (tier) lessonFilter['access.requiredTier'] = tier;

    const tierLessons = tier ? await Lesson.find(lessonFilter).select('_id') : null;
    const total = tier ? tierLessons!.length : await Lesson.countDocuments(lessonFilter);

    const progressFilter: Record<string, unknown> = { userId, moduleId };
    if (tier) progressFilter.lessonId = { $in: tierLessons!.map((l) => l._id) };
    const progresses = await UserLessonProgress.find(progressFilter);

    const completed = progresses.filter((p) => p.status === 'completed').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completed,
      total,
      progressPercent: percent,
      badge:
        completed === total && total > 0
          ? { kind: 'complete' }
          : completed > 0
            ? { kind: 'progress', label: `${percent}%` }
            : null,
    };
  }

  async getLesson(lessonId: string, userId: string) {
    const lesson = await Lesson.findById(lessonId).populate<{ moduleId: IModule }>('moduleId');
    if (!lesson || lesson.isDraft) throw new NotFoundError('Lesson not found');

    const canAccess = await this.canAccessLesson(userId, lesson as unknown as ILesson);
    if (!canAccess) throw new AuthorizationError('You do not have access to this lesson');

    const progress = await this.getUserLessonProgress(userId, lesson._id.toString());

    return {
      id: lesson._id,
      moduleId: { _id: lesson.moduleId._id, title: lesson.moduleId.title },
      month: lesson.month,
      category: lesson.category,
      title: lesson.title,
      type: lesson.type,
      author: lesson.author,
      metaLabel: lesson.metaLabel,
      progressPercent: progress?.progressPercent ?? 0,
      status: progress?.status ?? 'not-started',
      access: lesson.access,
      body: lesson.body,
    };
  }

  /**
   * Paginated at the database level (not fetch-all-then-slice) -- a module
   * can genuinely hold many lessons over a roadmap's lifetime, and every
   * lesson here still costs a canAccessLesson + getUserLessonProgress
   * lookup, so loading all of them up front on every page visit doesn't
   * scale. `tier` restricts to lessons written for exactly that tier (see
   * getModuleProgress) -- omit it for the general/backward-compatible view.
   */
  async getModuleLessons(userId: string, moduleId: string, tier?: MembershipTier, page = 1, limit = 4): Promise<{ items: any[]; totalItems: number }> {
    const filter: Record<string, unknown> = { moduleId, isDraft: { $ne: true } };
    if (tier) filter['access.requiredTier'] = tier;

    const [lessons, totalItems] = await Promise.all([
      Lesson.find(filter)
        .sort({ month: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Lesson.countDocuments(filter),
    ]);

    const items = await Promise.all(
      lessons.map(async (lesson) => {
        const canAccess = await this.canAccessLesson(userId, lesson);
        const progress = await this.getUserLessonProgress(userId, lesson._id.toString());

        let status: LessonStatus;
        if (!canAccess) {
          status = 'locked';
        } else if (progress?.status) {
          status = progress.status;
        } else {
          status = 'not-started';
        }

        const lockReason = !canAccess
          ? `Unlocks ${new Date(lesson.access.unlocksAt).toLocaleDateString()}`
          : undefined;

        return {
          id: lesson._id,
          moduleId: lesson.moduleId,
          month: lesson.month,
          category: lesson.category,
          title: lesson.title,
          type: lesson.type,
          author: lesson.author,
          metaLabel: lesson.metaLabel,
          progressPercent: progress?.progressPercent || 0,
          status,
          access: lesson.access,
          lockReason,
          body: canAccess ? lesson.body : undefined,
        };
      })
    );

    return { items, totalItems };
  }

  /** A Roadmap Week's modules, each with the member's per-module progress badge. */
  async getWeekModules(weekId: string, userId: string, tier?: MembershipTier) {
    const week = await RoadmapWeek.findById(weekId);
    if (!week) throw new NotFoundError('Roadmap week not found');

    const modules = await Module.find({ roadmapWeekId: weekId }).sort({ moduleNumber: 1 });

    const moduleSummaries = await Promise.all(
      modules.map(async (learningModule) => {
        // lessonCount comes from getModuleProgress's draft-excluded count, not
        // the module's raw lessons[] length — a draft lesson still lives in
        // that array but must never be visible to members.
        const progress = await this.getModuleProgress(userId, learningModule._id.toString(), tier);
        return {
          id: learningModule._id,
          moduleNumber: learningModule.moduleNumber,
          title: learningModule.title,
          badge: progress.badge,
          lessonCount: progress.total,
        };
      })
    );

    return {
      id: week._id,
      weekNumber: week.weekNumber,
      title: week.title,
      description: week.description,
      isCheckpoint: week.isCheckpoint,
      // A module with no lessons in scope for this tier is just noise on
      // the page (real product feedback: it "just creates more void") --
      // never true for the unscoped/no-tier call, since every module has
      // at least one lesson of *some* tier by construction.
      modules: tier ? moduleSummaries.filter((m) => m.lessonCount > 0) : moduleSummaries,
    };
  }

  /** Roadmap overview for a year: its weeks, plus the member's overall progress against it. */
  async getRoadmapForYear(userId: string, year: string, tier?: MembershipTier) {
    const roadmap = await Roadmap.findOne({ year });
    if (!roadmap) throw new NotFoundError('Roadmap not found for this year');

    const weeks = await RoadmapWeek.find({ roadmapId: roadmap._id }).sort({ weekNumber: 1 });

    // Embed each week's modules directly so the whole roadmap page renders
    // from this one request — matches the existing frontend pattern of one
    // overview call per page, module lesson bodies still fetched separately.
    const weekSummaries = await Promise.all(
      weeks.map(async (week) => {
        const allModulesInWeek = await Module.find({ roadmapWeekId: week._id }).sort({ moduleNumber: 1 });
        const allSummaries = await Promise.all(
          allModulesInWeek.map(async (learningModule) => {
            const progress = await this.getModuleProgress(userId, learningModule._id.toString(), tier);
            return {
              id: learningModule._id,
              moduleNumber: learningModule.moduleNumber,
              title: learningModule.title,
              badge: progress.badge,
              lessonCount: progress.total,
              progressPercent: progress.progressPercent,
              completed: progress.completed,
            };
          })
        );

        // Same reasoning as getWeekModules -- an empty module (no lessons
        // for this tier) is dropped from what's returned, not just hidden
        // client-side, so it never counts toward the week's own percentage.
        const moduleSummaries = tier ? allSummaries.filter((m) => m.lessonCount > 0) : allSummaries;

        const totalLessons = moduleSummaries.reduce((sum, m) => sum + m.lessonCount, 0);
        const completedLessons = moduleSummaries.reduce((sum, m) => sum + m.completed, 0);

        return {
          id: week._id,
          weekNumber: week.weekNumber,
          title: week.title,
          description: week.description,
          isCheckpoint: week.isCheckpoint,
          progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
          modules: moduleSummaries,
        };
      })
    );

    const allModules = await Module.find({ roadmapWeekId: { $in: weeks.map((w) => w._id) } });
    const allModuleProgress = await Promise.all(
      allModules.map((m) => this.getModuleProgress(userId, m._id.toString(), tier))
    );
    const grandTotalLessons = allModuleProgress.reduce((sum, p) => sum + p.total, 0);
    const grandCompletedLessons = allModuleProgress.reduce((sum, p) => sum + p.completed, 0);
    const overallPercent =
      grandTotalLessons > 0 ? Math.round((grandCompletedLessons / grandTotalLessons) * 100) : 0;

    return {
      year: roadmap.year,
      title: roadmap.title,
      description: roadmap.description,
      overallPercent,
      weeks: weekSummaries,
    };
  }

  /**
   * Continue Learning reads UserProgress only — it must never scan
   * UserLessonProgress at request time (that scan already happened, once,
   * when the Learning Progress Service last recalculated).
   */
  async getContinueWhereLeftOff(userId: string) {
    const progress = await UserProgress.findOne({ userId }).populate('currentLessonId');
    if (!progress?.currentLessonId) return [];

    const lesson = progress.currentLessonId as unknown as ILesson;
    // Single indexed lookup by (userId, lessonId) — not the full-table scan
    // the guide warns against; that's what recalculate() already avoided.
    const lessonProgress = await this.getUserLessonProgress(userId, lesson._id.toString());

    // Full lesson shape (not a stub) — the frontend's LessonCard resolves
    // access client-side too, as a defense-in-depth UI check, and needs the
    // same fields getModuleLessons returns.
    const canAccess = await this.canAccessLesson(userId, lesson);

    return [
      {
        id: lesson._id,
        moduleId: lesson.moduleId,
        month: lesson.month,
        category: lesson.category,
        title: lesson.title,
        type: lesson.type,
        author: lesson.author,
        metaLabel: lesson.metaLabel,
        progressPercent: lessonProgress?.progressPercent ?? 0,
        status: lessonProgress?.status ?? 'not-started',
        access: lesson.access,
        lockReason: !canAccess
          ? `Unlocks ${new Date(lesson.access.unlocksAt).toLocaleDateString()}`
          : undefined,
        body: canAccess ? lesson.body : undefined,
      },
    ];
  }
}

export const learningService = new LearningService();

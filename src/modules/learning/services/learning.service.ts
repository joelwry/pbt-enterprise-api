import {
  Lesson,
  Module,
  UserLessonProgress,
  ILesson,
  IModule,
  IUserLessonProgress,
  LessonStatus,
} from '@/modules/learning/schemas/Learning.schema';
import { Roadmap } from '@/modules/learning/schemas/Roadmap.schema';
import { RoadmapWeek } from '@/modules/learning/schemas/RoadmapWeek.schema';
import { learningProgressService } from '@/modules/learning/services/learning-progress.service';
import { subscriptionService } from '@/modules/subscriptions/services/subscription.service';
import { UserProgress } from '@/modules/progress/schemas/UserProgress.schema';
import { NotFoundError, AuthorizationError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

export class LearningService {
  /** Available roadmap years — what used to be called "years" before Programme was retired. */
  async getRoadmapYears() {
    return Roadmap.find().sort({ year: -1 }).select('year title isCurrent');
  }

  /**
   * Lesson access passes two independent gates: the Membership Gate (tier
   * hierarchy) and the Release Gate (unlocksAt). Both are enforced here,
   * server-side — never trust a client to have hidden locked content.
   */
  isLessonUnlocked(lesson: ILesson): boolean {
    return new Date() >= lesson.access.unlocksAt;
  }

  async canAccessLesson(userId: string, lesson: ILesson): Promise<boolean> {
    if (!this.isLessonUnlocked(lesson)) return false;
    return subscriptionService.canAccessTier(userId, lesson.access.requiredTier);
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
    quizScore?: number
  ): Promise<IUserLessonProgress> {
    let progress = await UserLessonProgress.findOne({ userId, lessonId });

    if (!progress) {
      progress = new UserLessonProgress({
        userId,
        lessonId,
        moduleId,
        status,
        progressPercent,
        quizScore,
        lastAccessedAt: new Date(),
      });
    } else {
      progress.status = status;
      progress.progressPercent = progressPercent;
      if (quizScore !== undefined) progress.quizScore = quizScore;
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

    return saved;
  }

  async getModuleProgress(userId: string, moduleId: string) {
    // Denominator must be the module's actual lesson count, not the count of
    // progress records that happen to exist — most lessons have no record
    // until a member first opens them, which would otherwise inflate the %.
    const [progresses, total] = await Promise.all([
      UserLessonProgress.find({ userId, moduleId }),
      Lesson.countDocuments({ moduleId }),
    ]);

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
    if (!lesson) throw new NotFoundError('Lesson not found');

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

  async getModuleLessons(userId: string, moduleId: string): Promise<any[]> {
    const lessons = await Lesson.find({ moduleId });

    return Promise.all(
      lessons.map(async (lesson) => {
        const canAccess = await this.canAccessLesson(userId, lesson);
        const progress = await this.getUserLessonProgress(userId, lesson._id.toString());
        const unlocked = this.isLessonUnlocked(lesson);

        let status: LessonStatus;
        if (!canAccess && !unlocked) {
          status = 'locked';
        } else if (progress?.status) {
          status = progress.status;
        } else {
          status = 'not-started';
        }

        const lockReason = !unlocked
          ? `Unlocks ${new Date(lesson.access.unlocksAt).toLocaleDateString()}`
          : !canAccess
            ? `Requires ${lesson.access.requiredTier} membership`
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
  }

  /** A Roadmap Week's modules, each with the member's per-module progress badge. */
  async getWeekModules(weekId: string, userId: string) {
    const week = await RoadmapWeek.findById(weekId);
    if (!week) throw new NotFoundError('Roadmap week not found');

    const modules = await Module.find({ roadmapWeekId: weekId })
      .populate({ path: 'lessons', select: 'title type month category' })
      .sort({ moduleNumber: 1 });

    const moduleSummaries = await Promise.all(
      modules.map(async (learningModule) => {
        const progress = await this.getModuleProgress(userId, learningModule._id.toString());
        return {
          id: learningModule._id,
          moduleNumber: learningModule.moduleNumber,
          title: learningModule.title,
          badge: progress.badge,
          lessonCount: learningModule.lessons?.length || 0,
        };
      })
    );

    return {
      id: week._id,
      weekNumber: week.weekNumber,
      title: week.title,
      description: week.description,
      modules: moduleSummaries,
    };
  }

  /** Roadmap overview for a year: its weeks, plus the member's overall progress against it. */
  async getRoadmapForYear(userId: string, year: string) {
    const roadmap = await Roadmap.findOne({ year });
    if (!roadmap) throw new NotFoundError('Roadmap not found for this year');

    const weeks = await RoadmapWeek.find({ roadmapId: roadmap._id }).sort({ weekNumber: 1 });

    // Embed each week's modules directly so the whole roadmap page renders
    // from this one request — matches the existing frontend pattern of one
    // overview call per page, module lesson bodies still fetched separately.
    const weekSummaries = await Promise.all(
      weeks.map(async (week) => {
        const modules = await Module.find({ roadmapWeekId: week._id }).sort({ moduleNumber: 1 });
        const moduleSummaries = await Promise.all(
          modules.map(async (learningModule) => {
            const progress = await this.getModuleProgress(userId, learningModule._id.toString());
            return {
              id: learningModule._id,
              moduleNumber: learningModule.moduleNumber,
              title: learningModule.title,
              badge: progress.badge,
              lessonCount: learningModule.lessons?.length || 0,
              progressPercent: progress.progressPercent,
            };
          })
        );

        const totalLessons = moduleSummaries.reduce((sum, m) => sum + m.lessonCount, 0);
        const moduleProgress = await Promise.all(
          modules.map((m) => this.getModuleProgress(userId, m._id.toString()))
        );
        const completedLessons = moduleProgress.reduce((sum, p) => sum + p.completed, 0);

        return {
          id: week._id,
          weekNumber: week.weekNumber,
          title: week.title,
          description: week.description,
          progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
          modules: moduleSummaries,
        };
      })
    );

    const allModules = await Module.find({ roadmapWeekId: { $in: weeks.map((w) => w._id) } });
    const allModuleProgress = await Promise.all(
      allModules.map((m) => this.getModuleProgress(userId, m._id.toString()))
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
    const unlocked = this.isLessonUnlocked(lesson);
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
        lockReason: !unlocked
          ? `Unlocks ${new Date(lesson.access.unlocksAt).toLocaleDateString()}`
          : !canAccess
            ? `Requires ${lesson.access.requiredTier} membership`
            : undefined,
        body: canAccess ? lesson.body : undefined,
      },
    ];
  }
}

export const learningService = new LearningService();

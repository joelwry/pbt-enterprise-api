import {
  Lesson,
  Module,
  UserLessonProgress,
  ILesson,
  IModule,
  IUserLessonProgress,
  LessonStatus,
  LessonType,
} from '@/modules/learning/schemas/Learning.schema';
import { membershipService } from '@/modules/memberships/services/membership.service';
import { NotFoundError, AuthorizationError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

export class LearningService {
  /**
   * Get all modules for a program year
   */
  async getModulesByYear(year: string, userId: string): Promise<IModule[]> {
    const modules = await Module.find({ programYear: year })
      .populate({
        path: 'lessons',
        select: 'title type month category',
      })
      .sort({ moduleNumber: 1 });

    return modules;
  }

  /**
   * Get lesson with access control
   */
  async getLesson(lessonId: string, userId: string): Promise<ILesson> {
    const lesson = await Lesson.findById(lessonId).populate('moduleId');

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    // Check access
    const canAccess = await this.canAccessLesson(userId, lesson);
    if (!canAccess) {
      throw new AuthorizationError('You do not have access to this lesson');
    }

    return lesson;
  }

  /**
   * Check if lesson is unlocked (based on time schedule)
   */
  isLessonUnlocked(lesson: ILesson): boolean {
    return new Date() >= lesson.access.unlocksAt;
  }

  /**
   * Check if user can access lesson
   */
  async canAccessLesson(userId: string, lesson: ILesson): Promise<boolean> {
    // Check if unlocked
    if (!this.isLessonUnlocked(lesson)) {
      return false;
    }

    // Check tier access
    const canAccessTier = await membershipService.canAccessTier(userId, lesson.access.requiredTier);
    if (!canAccessTier) {
      return false;
    }

    return true;
  }

  /**
   * Get user's lesson progress
   */
  async getUserLessonProgress(
    userId: string,
    lessonId: string
  ): Promise<IUserLessonProgress | null> {
    return UserLessonProgress.findOne({
      userId,
      lessonId,
    });
  }

  /**
   * Update lesson progress
   */
  async updateLessonProgress(
    userId: string,
    lessonId: string,
    moduleId: string,
    status: LessonStatus,
    progressPercent: number = 0,
    quizScore?: number
  ): Promise<IUserLessonProgress> {
    let progress = await UserLessonProgress.findOne({
      userId,
      lessonId,
    });

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

    return saved;
  }

  /**
   * Get module progress for user
   */
  async getModuleProgress(userId: string, moduleId: string) {
    const progresses = await UserLessonProgress.find({
      userId,
      moduleId,
    });

    const completed = progresses.filter((p) => p.status === 'completed').length;
    const total = progresses.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completed,
      total,
      progressPercent: percent,
      badge: completed === total ? { kind: 'complete' } : 
             completed > 0 ? { kind: 'progress', label: `${percent}%` } : null,
    };
  }

  /**
   * Get all lessons in module with user progress
   */
  async getModuleLessons(userId: string, moduleId: string): Promise<any[]> {
    const lessons = await Lesson.find({ moduleId });

    const lessonsWithStatus = await Promise.all(
      lessons.map(async (lesson) => {
        const canAccess = await this.canAccessLesson(userId, lesson);
        const progress = await this.getUserLessonProgress(userId, lesson._id.toString());

        let status: LessonStatus;
        if (!canAccess && !this.isLessonUnlocked(lesson)) {
          status = 'locked';
        } else if (progress?.status) {
          status = progress.status;
        } else {
          status = 'not-started';
        }

        const lockReason = !canAccess && !this.isLessonUnlocked(lesson)
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

    return lessonsWithStatus;
  }

  /**
   * Get year programme overview
   */
  async getYearProgramme(userId: string, year: string) {
    const modules = await this.getModulesByYear(year, userId);

    const moduleSummaries = await Promise.all(
      modules.map(async (module) => {
        const progress = await this.getModuleProgress(userId, module._id.toString());
        return {
          id: module._id,
          moduleNumber: module.moduleNumber,
          title: module.title,
          badge: progress.badge,
          lessonCount: module.lessons?.length || 0,
        };
      })
    );

    // Get overall progress
    const allProgress = await Promise.all(
      modules.map((m) => this.getModuleProgress(userId, m._id.toString()))
    );

    const totalLessons = allProgress.reduce((sum, p) => sum + p.total, 0);
    const completedLessons = allProgress.reduce((sum, p) => sum + p.completed, 0);
    const overallPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      year,
      overallPercent,
      modules: moduleSummaries,
    };
  }

  /**
   * Get continue where left off - recent lessons
   */
  async getContinueWhereLeftOff(userId: string, limit: number = 3) {
    const recentProgress = await UserLessonProgress.find({
      userId,
      status: { $in: ['in-progress', 'not-started'] },
    })
      .sort({ lastAccessedAt: -1 })
      .limit(limit)
      .populate('lessonId');

    return recentProgress.map((p: any) => ({
      id: p.lessonId._id,
      title: p.lessonId.title,
      type: p.lessonId.type,
      progressPercent: p.progressPercent,
      status: p.status,
    }));
  }
}

export const learningService = new LearningService();

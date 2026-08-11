import { Types } from 'mongoose';
import { Lesson, Module, UserLessonProgress } from '@/modules/learning/schemas/Learning.schema';
import { RoadmapWeek } from '@/modules/learning/schemas/RoadmapWeek.schema';
import { UserProgress } from '@/modules/progress/schemas/UserProgress.schema';
import logger from '@/core/logger/logger';

/**
 * The single place UserProgress is written. UserLessonProgress is the
 * canonical record of lesson-level activity; this service recalculates the
 * member's aggregate projection from it whenever a lesson-progress record
 * changes. See pbt_phase3_intgration_guide.md, "Progress Architecture".
 */
export class LearningProgressService {
  async recalculate(userId: string): Promise<void> {
    const progressRecords = await UserLessonProgress.find({ userId });

    const completedLessonsCount = progressRecords.filter((p) => p.status === 'completed').length;
    const totalLearningMinutes = progressRecords.reduce((sum, p) => sum + (p.timeSpentMinutes || 0), 0);

    const moduleIds = [...new Set(progressRecords.map((p) => p.moduleId.toString()))];
    let completedModulesCount = 0;
    for (const moduleId of moduleIds) {
      const lessonsInModule = await Lesson.countDocuments({ moduleId, isDraft: { $ne: true } });
      const completedInModule = progressRecords.filter(
        (p) => p.moduleId.toString() === moduleId && p.status === 'completed'
      ).length;
      if (lessonsInModule > 0 && completedInModule === lessonsInModule) completedModulesCount++;
    }

    const totalLessons = await Lesson.countDocuments({ isDraft: { $ne: true } });
    const overallProgress = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;

    // "Continue" target: the most recently touched in-progress lesson, or
    // failing that, the earliest lesson the member hasn't completed yet.
    const inProgress = progressRecords
      .filter((p) => p.status === 'in-progress')
      .sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime())[0];

    let currentLessonId: Types.ObjectId | undefined = inProgress?.lessonId;
    let currentModuleId: Types.ObjectId | undefined = inProgress?.moduleId;

    if (!currentLessonId) {
      const completedLessonIds = progressRecords.filter((p) => p.status === 'completed').map((p) => p.lessonId);
      const nextLesson = await Lesson.findOne({
        _id: { $nin: completedLessonIds },
        isDraft: { $ne: true },
      }).sort({ month: 1 });
      currentLessonId = nextLesson?._id as Types.ObjectId | undefined;
      currentModuleId = nextLesson?.moduleId;
    }

    let currentRoadmapWeekId: Types.ObjectId | undefined;
    if (currentModuleId) {
      const learningModule = await Module.findById(currentModuleId);
      currentRoadmapWeekId = learningModule?.roadmapWeekId;
    }

    let currentRoadmapId: Types.ObjectId | undefined;
    if (currentRoadmapWeekId) {
      const week = await RoadmapWeek.findById(currentRoadmapWeekId);
      currentRoadmapId = week?.roadmapId;
    }

    const streakDays = this.calculateStreak(
      progressRecords.map((p) => p.completedAt).filter((d): d is Date => Boolean(d))
    );

    await UserProgress.findOneAndUpdate(
      { userId },
      {
        currentRoadmapId,
        currentRoadmapWeekId,
        currentModuleId,
        currentLessonId,
        completedLessonsCount,
        completedModulesCount,
        overallProgress,
        totalLearningMinutes,
        streakDays,
      },
      { upsert: true }
    );

    logger.info('User progress recalculated', { userId, overallProgress, completedLessonsCount });
  }

  /** Consecutive days up to and including today with at least one lesson completion. */
  private calculateStreak(completionDates: Date[]): number {
    if (completionDates.length === 0) return 0;

    const days = new Set(completionDates.map((d) => new Date(d).toDateString()));
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (days.has(cursor.toDateString())) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }
}

export const learningProgressService = new LearningProgressService();

import { UserProgress } from '../schemas/UserProgress.schema';
import logger from '@/core/logger/logger';

/**
 * Read-only access to the aggregate UserProgress projection. Nothing here
 * writes to UserProgress — only the Learning Progress Service does that,
 * triggered by UserLessonProgress changes. See
 * pbt_phase3_intgration_guide.md, "Progress Architecture".
 */
export class ProgressService {
  async getUserProgress(userId: string) {
    try {
      return await UserProgress.findOne({ userId });
    } catch (error) {
      logger.error('Error fetching user progress', { userId, error });
      throw error;
    }
  }

  async getUserStats(userId: string) {
    try {
      const progress = await UserProgress.findOne({ userId });

      return {
        completedLessonsCount: progress?.completedLessonsCount ?? 0,
        completedModulesCount: progress?.completedModulesCount ?? 0,
        overallProgress: progress?.overallProgress ?? 0,
        streakDays: progress?.streakDays ?? 0,
        totalLearningMinutes: progress?.totalLearningMinutes ?? 0,
      };
    } catch (error) {
      logger.error('Error getting user stats', { userId, error });
      throw error;
    }
  }
}

export default new ProgressService();

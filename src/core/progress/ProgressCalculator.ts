import { UserProgress } from '@/modules/progress/schemas/UserProgress.schema';
import logger from '@/core/logger/logger';

export class ProgressCalculator {
  static calculateOverallProgress(completedItems: number, totalItems: number): number {
    if (totalItems === 0) return 0;
    return Math.round((completedItems / totalItems) * 100);
  }

  static calculateEstimatedCompletionDate(
    currentProgress: number,
    dailyProgressRate: number
  ): Date | null {
    if (dailyProgressRate <= 0 || currentProgress >= 100) return null;

    const remainingProgress = 100 - currentProgress;
    const daysNeeded = Math.ceil(remainingProgress / dailyProgressRate);
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + daysNeeded);

    return completionDate;
  }

  static calculateStreakDays(lastAccessDate: Date): number {
    const today = new Date();
    const lastAccess = new Date(lastAccessDate);

    const diffTime = today.getTime() - lastAccess.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, 1 - diffDays);
  }

  static async calculateUserTotalProgress(userId: string): Promise<number> {
    try {
      const progressRecords = await UserProgress.find({ userId });

      if (progressRecords.length === 0) return 0;

      const totalProgress = progressRecords.reduce((sum, record) => sum + record.overallProgress, 0);
      const averageProgress = Math.round(totalProgress / progressRecords.length);

      logger.info('User total progress calculated', { userId, averageProgress });
      return averageProgress;
    } catch (error) {
      logger.error('Error calculating user total progress', { userId, error });
      throw error;
    }
  }

  static async calculateProgrammeMetrics(programmeId: string) {
    try {
      const progressRecords = await UserProgress.find({ programmeId });

      const metrics = {
        totalEnrolled: progressRecords.length,
        completedCount: progressRecords.filter((p) => p.overallProgress === 100).length,
        averageProgress: Math.round(
          progressRecords.reduce((sum, p) => sum + p.overallProgress, 0) / Math.max(progressRecords.length, 1)
        ),
        totalLearningMinutes: progressRecords.reduce((sum, p) => sum + p.totalLearningMinutes, 0),
        activeUsers: progressRecords.filter((p) => p.overallProgress > 0 && p.overallProgress < 100).length,
        completionRate:
          progressRecords.length > 0
            ? Math.round((progressRecords.filter((p) => p.overallProgress === 100).length / progressRecords.length) * 100)
            : 0,
      };

      logger.info('Programme metrics calculated', { programmeId, metrics });
      return metrics;
    } catch (error) {
      logger.error('Error calculating programme metrics', { programmeId, error });
      throw error;
    }
  }

  static calculateLessonCompletionTime(progressRecords: any[]): number {
    if (progressRecords.length === 0) return 0;

    const completedRecords = progressRecords.filter((r) => r.completedAt);
    if (completedRecords.length === 0) return 0;

    const totalTime = completedRecords.reduce((sum, record) => {
      const startTime = new Date(record.lastAccessedAt).getTime();
      const endTime = new Date(record.completedAt).getTime();
      return sum + (endTime - startTime);
    }, 0);

    return Math.round(totalTime / (1000 * 60 * completedRecords.length));
  }

  static calculateLearningVelocity(
    previousProgress: number,
    currentProgress: number,
    daysPassed: number
  ): number {
    if (daysPassed === 0) return 0;
    return (currentProgress - previousProgress) / daysPassed;
  }

  static predictCompletionConfidence(
    currentProgress: number,
    learningVelocity: number,
    daysRemaining: number
  ): number {
    if (learningVelocity <= 0) return 0;

    const projectedProgress = currentProgress + learningVelocity * daysRemaining;
    const confidence = Math.min(Math.round((projectedProgress / 100) * 100), 100);

    return Math.max(0, confidence);
  }
}

export default ProgressCalculator;

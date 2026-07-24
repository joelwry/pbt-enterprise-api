import { UserProgress } from '../schemas/UserProgress.schema';
import { Milestone } from '../schemas/Milestone.schema';
import { AppError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

export class ProgressService {
  async getUserProgress(userId: string, programmeId: string) {
    try {
      const progress = await UserProgress.findOne({ userId, programmeId });
      if (!progress) {
        throw new AppError('User progress not found', 404, 'ERR_3001');
      }
      return progress;
    } catch (error) {
      logger.error('Error fetching user progress', { userId, programmeId, error });
      throw error;
    }
  }

  async initializeUserProgress(userId: string, programmeId: string, totalLessons: number) {
    try {
      const existingProgress = await UserProgress.findOne({ userId, programmeId });
      if (existingProgress) {
        return existingProgress;
      }

      const newProgress = new UserProgress({
        userId,
        programmeId,
        completedModules: [],
        completedLessons: [],
        lessonsProgress: Array(totalLessons)
          .fill(null)
          .map((_, idx) => ({
            lessonId: `lesson_${idx}`,
            completionPercentage: 0,
            lastAccessedAt: new Date(),
            timeSpentMinutes: 0,
          })),
        overallProgress: 0,
        streakDays: 0,
        totalLearningMinutes: 0,
        bookmarkedItems: [],
        notes: [],
      });

      await newProgress.save();
      logger.info('User progress initialized', { userId, programmeId });
      return newProgress;
    } catch (error) {
      logger.error('Error initializing user progress', { userId, programmeId, error });
      throw error;
    }
  }

  async updateLessonProgress(
    userId: string,
    programmeId: string,
    lessonId: string,
    completionPercentage: number,
    timeSpentMinutes: number
  ) {
    try {
      const progress = await UserProgress.findOne({ userId, programmeId });
      if (!progress) {
        throw new AppError('User progress not found', 404, 'ERR_3001');
      }

      // Update lesson progress
      const lessonProgress = progress.lessonsProgress.find((lp) => lp.lessonId === lessonId);
      if (lessonProgress) {
        lessonProgress.completionPercentage = Math.min(completionPercentage, 100);
        lessonProgress.lastAccessedAt = new Date();
        lessonProgress.timeSpentMinutes += timeSpentMinutes;

        if (completionPercentage === 100 && !lessonProgress.completedAt) {
          lessonProgress.completedAt = new Date();
        }
      }

      // Recalculate overall progress
      const completedLessons = progress.lessonsProgress.filter((lp) => lp.completionPercentage === 100).length;
      progress.overallProgress = Math.round((completedLessons / progress.lessonsProgress.length) * 100);

      // Update total learning minutes
      progress.totalLearningMinutes += timeSpentMinutes;

      await progress.save();
      logger.info('Lesson progress updated', { userId, programmeId, lessonId });
      return progress;
    } catch (error) {
      logger.error('Error updating lesson progress', { userId, programmeId, lessonId, error });
      throw error;
    }
  }

  async markLessonComplete(userId: string, programmeId: string, lessonId: string) {
    try {
      const progress = await UserProgress.findOne({ userId, programmeId });
      if (!progress) {
        throw new AppError('User progress not found', 404, 'ERR_3001');
      }

      if (!progress.completedLessons.includes(lessonId)) {
        progress.completedLessons.push(lessonId);
      }

      const lessonProgress = progress.lessonsProgress.find((lp) => lp.lessonId === lessonId);
      if (lessonProgress) {
        lessonProgress.completionPercentage = 100;
        lessonProgress.completedAt = new Date();
      }

      // Recalculate overall progress
      progress.overallProgress = Math.round((progress.completedLessons.length / progress.lessonsProgress.length) * 100);

      await progress.save();
      logger.info('Lesson marked complete', { userId, programmeId, lessonId });
      return progress;
    } catch (error) {
      logger.error('Error marking lesson complete', { userId, programmeId, lessonId, error });
      throw error;
    }
  }

  async getContinueWhere(userId: string, programmeId: string) {
    try {
      const progress = await UserProgress.findOne({ userId, programmeId });
      if (!progress) {
        throw new AppError('User progress not found', 404, 'ERR_3001');
      }

      // Find the first incomplete lesson
      const incompleteLesson = progress.lessonsProgress.find((lp) => lp.completionPercentage < 100);

      if (!incompleteLesson) {
        return {
          status: 'completed',
          message: 'All lessons completed',
          progress: 100,
        };
      }

      return {
        status: 'in-progress',
        currentLessonId: incompleteLesson.lessonId,
        completionPercentage: incompleteLesson.completionPercentage,
        overallProgress: progress.overallProgress,
      };
    } catch (error) {
      logger.error('Error getting continue where', { userId, programmeId, error });
      throw error;
    }
  }

  async addNote(userId: string, programmeId: string, contentId: string, note: string) {
    try {
      const progress = await UserProgress.findOne({ userId, programmeId });
      if (!progress) {
        throw new AppError('User progress not found', 404, 'ERR_3001');
      }

      progress.notes.push({
        contentId,
        note,
        createdAt: new Date(),
      });

      await progress.save();
      logger.info('Note added', { userId, contentId });
      return progress;
    } catch (error) {
      logger.error('Error adding note', { userId, contentId, error });
      throw error;
    }
  }

  async getUserStats(userId: string) {
    try {
      const progressRecords = await UserProgress.find({ userId });

      const totalProgress = progressRecords.reduce((acc, p) => acc + p.overallProgress, 0);
      const avgProgress = progressRecords.length > 0 ? totalProgress / progressRecords.length : 0;

      const totalMinutes = progressRecords.reduce((acc, p) => acc + p.totalLearningMinutes, 0);

      return {
        programmesEnrolled: progressRecords.length,
        averageProgress: Math.round(avgProgress),
        totalLearningMinutes,
        maxStreak: Math.max(...progressRecords.map((p) => p.streakDays), 0),
      };
    } catch (error) {
      logger.error('Error getting user stats', { userId, error });
      throw error;
    }
  }
}

export default new ProgressService();

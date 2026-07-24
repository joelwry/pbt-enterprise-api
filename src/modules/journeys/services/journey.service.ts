import { LearningJourney } from '../schemas/LearningJourney.schema';
import { AppError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

export class JourneyService {
  async getUserJourneys(userId: string, status?: string) {
    try {
      const query: any = { userId };
      if (status) query.status = status;

      const journeys = await LearningJourney.find(query).sort({ startedAt: -1 });
      return journeys;
    } catch (error) {
      logger.error('Error fetching user journeys', { userId, error });
      throw error;
    }
  }

  async createJourney(userId: string, journeyData: any) {
    try {
      const journey = new LearningJourney({
        userId,
        ...journeyData,
        startedAt: new Date(),
        currentStep: 0,
        progress: 0,
        status: 'active',
      });

      await journey.save();
      logger.info('Learning journey created', { userId, journeyName: journeyData.journeyName });
      return journey;
    } catch (error) {
      logger.error('Error creating journey', { userId, error });
      throw error;
    }
  }

  async updateJourneyProgress(journeyId: string, currentStep: number, progress: number) {
    try {
      const journey = await LearningJourney.findByIdAndUpdate(
        journeyId,
        {
          currentStep,
          progress: Math.min(progress, 100),
        },
        { new: true }
      );

      if (!journey) {
        throw new AppError('Journey not found', 404, 'ERR_7001');
      }

      logger.info('Journey progress updated', { journeyId, progress });
      return journey;
    } catch (error) {
      logger.error('Error updating journey progress', { journeyId, error });
      throw error;
    }
  }

  async completeJourney(journeyId: string) {
    try {
      const journey = await LearningJourney.findByIdAndUpdate(
        journeyId,
        {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
        },
        { new: true }
      );

      if (!journey) {
        throw new AppError('Journey not found', 404, 'ERR_7001');
      }

      logger.info('Journey completed', { journeyId });
      return journey;
    } catch (error) {
      logger.error('Error completing journey', { journeyId, error });
      throw error;
    }
  }

  async pauseJourney(journeyId: string) {
    try {
      const journey = await LearningJourney.findByIdAndUpdate(journeyId, { status: 'paused' }, { new: true });

      if (!journey) {
        throw new AppError('Journey not found', 404, 'ERR_7001');
      }

      logger.info('Journey paused', { journeyId });
      return journey;
    } catch (error) {
      logger.error('Error pausing journey', { journeyId, error });
      throw error;
    }
  }

  async resumeJourney(journeyId: string) {
    try {
      const journey = await LearningJourney.findByIdAndUpdate(journeyId, { status: 'active' }, { new: true });

      if (!journey) {
        throw new AppError('Journey not found', 404, 'ERR_7001');
      }

      logger.info('Journey resumed', { journeyId });
      return journey;
    } catch (error) {
      logger.error('Error resuming journey', { journeyId, error });
      throw error;
    }
  }

  async recordMilestoneCompletion(journeyId: string, milestoneId: string) {
    try {
      const journey = await LearningJourney.findById(journeyId);

      if (!journey) {
        throw new AppError('Journey not found', 404, 'ERR_7001');
      }

      const existingMilestone = journey.milestones.find((m) => m.milestoneId === milestoneId);

      if (!existingMilestone) {
        journey.milestones.push({
          milestoneId,
          completed: true,
          completedAt: new Date(),
        });
      } else {
        existingMilestone.completed = true;
        existingMilestone.completedAt = new Date();
      }

      await journey.save();
      logger.info('Milestone recorded', { journeyId, milestoneId });
      return journey;
    } catch (error) {
      logger.error('Error recording milestone', { journeyId, error });
      throw error;
    }
  }

  async getJourneyStats(journeyId: string) {
    try {
      const journey = await LearningJourney.findById(journeyId);

      if (!journey) {
        throw new AppError('Journey not found', 404, 'ERR_7001');
      }

      const completedMilestones = journey.milestones.filter((m) => m.completed).length;
      const timeRemainingDays = journey.expectedCompletionDate
        ? Math.max(0, Math.ceil((journey.expectedCompletionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

      return {
        journeyName: journey.journeyName,
        progress: journey.progress,
        currentStep: journey.currentStep,
        totalSteps: journey.lessonSequence.length,
        completedMilestones,
        totalMilestones: journey.milestones.length,
        estimatedDurationHours: journey.estimatedDurationHours,
        timeRemainingDays,
        status: journey.status,
      };
    } catch (error) {
      logger.error('Error getting journey stats', { journeyId, error });
      throw error;
    }
  }

  async getUserActiveJourneys(userId: string, limit: number = 5) {
    try {
      const journeys = await LearningJourney.find({ userId, status: { $in: ['active', 'paused'] } })
        .limit(limit)
        .sort({ updatedAt: -1 });

      return journeys;
    } catch (error) {
      logger.error('Error fetching active journeys', { userId, error });
      throw error;
    }
  }
}

export default new JourneyService();

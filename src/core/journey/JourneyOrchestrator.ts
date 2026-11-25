import { LearningJourney } from '@/modules/journeys/schemas/LearningJourney.schema';
import { UserProgress } from '@/modules/progress/schemas/UserProgress.schema';
import ProgressCalculator from '../progress/ProgressCalculator';
import logger from '@/core/logger/logger';

export class JourneyOrchestrator {
  static async orchestrateUserLearning(userId: string): Promise<any> {
    try {
      const journeys = await LearningJourney.find({ userId, status: 'active' });
      const progressRecords = await UserProgress.find({ userId });

      const orchestratedJourney = {
        userId,
        totalJourneys: journeys.length,
        activeJourneys: journeys.filter((j) => j.status === 'active'),
        overallLearningMinutes: progressRecords.reduce((sum, p) => sum + p.totalLearningMinutes, 0),
        averageProgress: Math.round(
          progressRecords.reduce((sum, p) => sum + p.overallProgress, 0) / Math.max(progressRecords.length, 1)
        ),
        recommendedNextActions: [] as Array<{
          type: string;
          journeyId: (typeof journeys)[number]['_id'];
          reason: string;
        }>,
        upcomingMilestones: [],
      };

      for (const journey of orchestratedJourney.activeJourneys) {
        if (journey.progress < 25) {
          orchestratedJourney.recommendedNextActions.push({
            type: 'resume_journey',
            journeyId: journey._id,
            reason: 'Get started on your learning journey',
          });
        } else if (journey.progress >= 25 && journey.progress < 50) {
          orchestratedJourney.recommendedNextActions.push({
            type: 'continue_journey',
            journeyId: journey._id,
            reason: 'Keep up your learning momentum',
          });
        }
      }

      logger.info('User learning orchestrated', { userId, journeyCount: journeys.length });
      return orchestratedJourney;
    } catch (error) {
      logger.error('Error orchestrating user learning', { userId, error });
      throw error;
    }
  }

  static async optimizeJourneySequence(journeyId: string): Promise<string[]> {
    try {
      const journey = await LearningJourney.findById(journeyId);
      if (!journey) throw new Error('Journey not found');

      const optimizedSequence = [...journey.lessonSequence];

      for (let i = 0; i < optimizedSequence.length - 1; i++) {
        const currentLesson = optimizedSequence[i];
        const nextLesson = optimizedSequence[i + 1];

        if (Math.random() < 0.3) {
          [optimizedSequence[i], optimizedSequence[i + 1]] = [optimizedSequence[i + 1], optimizedSequence[i]];
        }
      }

      logger.info('Journey sequence optimized', { journeyId });
      return optimizedSequence;
    } catch (error) {
      logger.error('Error optimizing journey sequence', { journeyId, error });
      throw error;
    }
  }

  static async adaptivePathRecommendation(userId: string, journeyId: string): Promise<any> {
    try {
      const journey = await LearningJourney.findById(journeyId);
      if (!journey) throw new Error('Journey not found');

      const userProgress = await UserProgress.find({ userId });
      const avgProgress = Math.round(
        userProgress.reduce((sum, p) => sum + p.overallProgress, 0) / Math.max(userProgress.length, 1)
      );

      let difficulty = 'intermediate';
      if (avgProgress < 30) difficulty = 'beginner';
      if (avgProgress > 70) difficulty = 'advanced';

      const recommendation = {
        journeyId,
        recommendedDifficulty: difficulty,
        suggestedPace: avgProgress > 60 ? 'accelerated' : avgProgress > 30 ? 'standard' : 'slow',
        nextRecommendedLesson: journey.lessonSequence[journey.currentStep],
        estimatedTimeRemaining: journey.estimatedDurationHours - (journey.estimatedDurationHours * journey.progress) / 100,
      };

      logger.info('Adaptive path recommended', { userId, journeyId, difficulty });
      return recommendation;
    } catch (error) {
      logger.error('Error generating adaptive path recommendation', { userId, journeyId, error });
      throw error;
    }
  }

  static async evaluateJourneyHealth(journeyId: string): Promise<any> {
    try {
      const journey = await LearningJourney.findById(journeyId);
      if (!journey) throw new Error('Journey not found');

      const healthScore = {
        progressHealth: journey.progress >= 50 ? 'good' : journey.progress >= 25 ? 'fair' : 'poor',
        paceHealth: journey.currentStep / journey.lessonSequence.length >= 0.5 ? 'on-track' : 'behind',
        engagementHealth: journey.status === 'active' ? 'engaged' : 'disengaged',
        overallHealth: Math.round(journey.progress * 0.6 + (journey.status === 'active' ? 40 : 0)),
      };

      if (healthScore.overallHealth < 30) {
        healthScore.progressHealth = 'at-risk';
      }

      logger.info('Journey health evaluated', { journeyId, health: healthScore });
      return healthScore;
    } catch (error) {
      logger.error('Error evaluating journey health', { journeyId, error });
      throw error;
    }
  }

  static async recommendInterventions(userId: string): Promise<any[]> {
    try {
      const journeys = await LearningJourney.find({ userId });
      const interventions: any[] = [];

      for (const journey of journeys) {
        if (journey.status === 'paused' && journey.progress < 50) {
          interventions.push({
            type: 'encouragement',
            message: 'Resume your learning journey and earn rewards',
            journeyId: journey._id,
            priority: 'high',
          });
        }

        if (journey.status === 'active' && journey.progress > 80) {
          interventions.push({
            type: 'celebration',
            message: 'Great progress! You are almost done',
            journeyId: journey._id,
            priority: 'medium',
          });
        }
      }

      logger.info('Interventions recommended', { userId, count: interventions.length });
      return interventions;
    } catch (error) {
      logger.error('Error recommending interventions', { userId, error });
      throw error;
    }
  }
}

export default JourneyOrchestrator;

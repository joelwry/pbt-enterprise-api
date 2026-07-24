import { Milestone } from '../schemas/Milestone.schema';
import { AppError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

export class MilestoneService {
  async getUserMilestones(userId: string, programmeId: string) {
    try {
      const milestones = await Milestone.find({ userId, programmeId });
      return milestones;
    } catch (error) {
      logger.error('Error fetching user milestones', { userId, programmeId, error });
      throw error;
    }
  }

  async initializeMilestones(userId: string, programmeId: string) {
    try {
      const defaultMilestones = [
        {
          userId,
          programmeId,
          title: 'First Steps',
          description: 'Complete your first lesson',
          type: 'completion',
          requiredValue: 1,
          currentValue: 0,
          reward: { points: 10, badge: 'first_steps' },
        },
        {
          userId,
          programmeId,
          title: 'Quarter Way',
          description: 'Complete 25% of the programme',
          type: 'completion',
          requiredValue: 25,
          currentValue: 0,
          reward: { points: 50, badge: 'quarter_way' },
        },
        {
          userId,
          programmeId,
          title: 'Halfway There',
          description: 'Complete 50% of the programme',
          type: 'completion',
          requiredValue: 50,
          currentValue: 0,
          reward: { points: 100, badge: 'halfway', certification: false },
        },
        {
          userId,
          programmeId,
          title: 'Learning Champion',
          description: 'Complete 100% of the programme',
          type: 'completion',
          requiredValue: 100,
          currentValue: 0,
          reward: { points: 250, badge: 'champion', certification: true },
        },
        {
          userId,
          programmeId,
          title: 'Daily Warrior',
          description: 'Maintain a 7-day learning streak',
          type: 'streak',
          requiredValue: 7,
          currentValue: 0,
          reward: { points: 75, badge: 'streak_warrior' },
        },
      ];

      const existingCount = await Milestone.countDocuments({ userId, programmeId });
      if (existingCount === 0) {
        await Milestone.insertMany(defaultMilestones);
        logger.info('Milestones initialized', { userId, programmeId });
      }

      return defaultMilestones;
    } catch (error) {
      logger.error('Error initializing milestones', { userId, programmeId, error });
      throw error;
    }
  }

  async updateMilestoneProgress(userId: string, programmeId: string, currentProgress: number) {
    try {
      const milestones = await Milestone.find({ userId, programmeId, isUnlocked: false });

      for (const milestone of milestones) {
        if (milestone.type === 'completion') {
          milestone.currentValue = currentProgress;

          if (currentProgress >= milestone.requiredValue) {
            milestone.isUnlocked = true;
            milestone.unlockedAt = new Date();
            logger.info('Milestone unlocked', { userId, milestoneId: milestone._id, title: milestone.title });
          }
        }
      }

      await Promise.all(milestones.map((m) => m.save()));
      return milestones;
    } catch (error) {
      logger.error('Error updating milestone progress', { userId, programmeId, error });
      throw error;
    }
  }

  async getUnlockedMilestones(userId: string, programmeId: string) {
    try {
      const unlockedMilestones = await Milestone.find({ userId, programmeId, isUnlocked: true });
      return unlockedMilestones;
    } catch (error) {
      logger.error('Error fetching unlocked milestones', { userId, programmeId, error });
      throw error;
    }
  }

  async calculateTotalRewards(userId: string, programmeId: string) {
    try {
      const unlockedMilestones = await Milestone.find({ userId, programmeId, isUnlocked: true });

      const totalPoints = unlockedMilestones.reduce((acc, m) => acc + (m.reward?.points || 0), 0);
      const badges = unlockedMilestones.map((m) => m.reward?.badge).filter(Boolean);
      const hasCertification = unlockedMilestones.some((m) => m.reward?.certification);

      return {
        totalPoints,
        badges,
        hasCertification,
        unlockedCount: unlockedMilestones.length,
      };
    } catch (error) {
      logger.error('Error calculating rewards', { userId, programmeId, error });
      throw error;
    }
  }
}

export default new MilestoneService();

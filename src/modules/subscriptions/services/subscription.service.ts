import { Subscription, SubscriptionDocument } from '@/modules/subscriptions/schemas/Subscription.schema';
import { AppError } from '@/core/errors/AppError';
import { logger } from '@/core/logger/logger';
import { Types } from 'mongoose';

export class SubscriptionService {
  /**
   * Get current active subscription for user
   */
  async getCurrentSubscription(userId: string): Promise<SubscriptionDocument | null> {
    try {
      const subscription = await Subscription.findOne({
        userId: new Types.ObjectId(userId),
        status: 'active',
        endDate: { $gt: new Date() },
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to get current subscription', { userId, error });
      throw new AppError('ERR_5001', 500, 'Failed to retrieve subscription');
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(subscriptionId: string): Promise<SubscriptionDocument | null> {
    try {
      return await Subscription.findById(subscriptionId);
    } catch (error) {
      logger.error('Failed to get subscription by ID', { subscriptionId, error });
      throw new AppError('ERR_5001', 500, 'Failed to retrieve subscription');
    }
  }

  /**
   * Create new subscription
   */
  async createSubscription(
    userId: string,
    tier: 'pathway' | 'plus' | 'mentorship',
    billingCycle: 'monthly' | 'annual',
    amount: number,
    currency: string = 'GBP',
    transactionId?: string
  ): Promise<SubscriptionDocument> {
    try {
      // Cancel existing active subscription
      await Subscription.updateMany(
        { userId: new Types.ObjectId(userId), status: 'active' },
        { status: 'cancelled', cancelledAt: new Date() }
      );

      const endDate = new Date();
      if (billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const subscription = new Subscription({
        userId: new Types.ObjectId(userId),
        tier,
        status: 'active',
        startDate: new Date(),
        endDate,
        autoRenew: true,
        billingCycle,
        amount,
        currency,
        transactionId,
      });

      const saved = await subscription.save();
      logger.info('Subscription created', { userId, tier, billingCycle });
      return saved;
    } catch (error) {
      logger.error('Failed to create subscription', { userId, tier, error });
      throw new AppError('ERR_5002', 500, 'Failed to create subscription');
    }
  }

  /**
   * Upgrade subscription tier
   */
  async upgradeSubscription(
    userId: string,
    newTier: 'pathway' | 'plus' | 'mentorship'
  ): Promise<SubscriptionDocument> {
    try {
      const currentSubscription = await this.getCurrentSubscription(userId);

      if (!currentSubscription) {
        throw new AppError('ERR_4010', 404, 'No active subscription found');
      }

      // Get tier hierarchy
      const tierHierarchy: Record<string, number> = {
        pathway: 1,
        plus: 2,
        mentorship: 3,
      };

      const currentTierLevel = tierHierarchy[currentSubscription.tier];
      const newTierLevel = tierHierarchy[newTier];

      if (newTierLevel <= currentTierLevel) {
        throw new AppError('ERR_3001', 400, 'Can only upgrade to a higher tier');
      }

      // Cancel old subscription
      currentSubscription.cancelledAt = new Date();
      currentSubscription.status = 'cancelled';
      await currentSubscription.save();

      // Create new subscription with same billing cycle and prorated cost
      return await this.createSubscription(
        userId,
        newTier,
        currentSubscription.billingCycle,
        this.getPriceForTier(newTier, currentSubscription.billingCycle)
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to upgrade subscription', { userId, newTier, error });
      throw new AppError('ERR_5003', 500, 'Failed to upgrade subscription');
    }
  }

  /**
   * Downgrade subscription tier
   */
  async downgradeSubscription(
    userId: string,
    newTier: 'pathway' | 'plus' | 'mentorship'
  ): Promise<SubscriptionDocument> {
    try {
      const currentSubscription = await this.getCurrentSubscription(userId);

      if (!currentSubscription) {
        throw new AppError('ERR_4010', 404, 'No active subscription found');
      }

      const tierHierarchy: Record<string, number> = {
        pathway: 1,
        plus: 2,
        mentorship: 3,
      };

      const currentTierLevel = tierHierarchy[currentSubscription.tier];
      const newTierLevel = tierHierarchy[newTier];

      if (newTierLevel >= currentTierLevel) {
        throw new AppError('ERR_3001', 400, 'Can only downgrade to a lower tier');
      }

      // Cancel old subscription
      currentSubscription.cancelledAt = new Date();
      currentSubscription.status = 'cancelled';
      await currentSubscription.save();

      // Create new subscription
      return await this.createSubscription(
        userId,
        newTier,
        currentSubscription.billingCycle,
        this.getPriceForTier(newTier, currentSubscription.billingCycle)
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to downgrade subscription', { userId, newTier, error });
      throw new AppError('ERR_5004', 500, 'Failed to downgrade subscription');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<SubscriptionDocument | null> {
    try {
      const subscription = await this.getCurrentSubscription(userId);

      if (!subscription) {
        throw new AppError('ERR_4010', 404, 'No active subscription found');
      }

      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
      const updated = await subscription.save();

      logger.info('Subscription cancelled', { userId, tier: subscription.tier });
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to cancel subscription', { userId, error });
      throw new AppError('ERR_5005', 500, 'Failed to cancel subscription');
    }
  }

  /**
   * Get all subscription tiers with features
   */
  getTierHierarchy() {
    return {
      pathway: {
        level: 1,
        name: 'PBT Pathway',
        features: ['basic-learning', 'community-access', 'resource-library'],
      },
      plus: {
        level: 2,
        name: 'PBT Plus',
        features: ['basic-learning', 'community-access', 'resource-library', 'premium-resources', 'event-access'],
      },
      mentorship: {
        level: 3,
        name: 'PBT Mentorship',
        features: ['basic-learning', 'community-access', 'resource-library', 'premium-resources', 'event-access', 'mentorship-access', 'power-team-access'],
      },
    };
  }

  /**
   * Get price for tier
   */
  getPriceForTier(tier: 'pathway' | 'plus' | 'mentorship', billingCycle: 'monthly' | 'annual'): number {
    const prices: Record<string, Record<string, number>> = {
      pathway: { monthly: 0, annual: 0 },
      plus: { monthly: 29.99, annual: 299.99 },
      mentorship: { monthly: 99.99, annual: 999.99 },
    };

    return prices[tier][billingCycle];
  }

  /**
   * Check if subscription is valid
   */
  isSubscriptionValid(subscription: SubscriptionDocument | null): boolean {
    if (!subscription) return false;
    return subscription.status === 'active' && subscription.endDate > new Date();
  }

  /**
   * Get subscription status
   */
  getSubscriptionStatus(subscription: SubscriptionDocument | null): string {
    if (!subscription) return 'none';
    if (subscription.status === 'cancelled') return 'cancelled';
    if (subscription.endDate < new Date()) return 'expired';
    return subscription.status;
  }
}

export const subscriptionService = new SubscriptionService();

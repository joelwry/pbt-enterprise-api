import { subscriptionService } from '@/modules/subscriptions/services/subscription.service';
import logger from '@/core/logger/logger';
import { Types } from 'mongoose';

export interface Feature {
  id: string;
  name: string;
  description: string;
  tier: 'pathway' | 'plus' | 'mentorship';
}

export interface EntitlementCheck {
  canAccess: boolean;
  tier: 'pathway' | 'plus' | 'mentorship' | 'none';
  reason?: string;
  suggestedUpgrade?: 'plus' | 'mentorship';
}

export interface UpgradePath {
  currentTier: string;
  possibleUpgrades: Array<{
    tier: string;
    cost: number;
    newFeatures: string[];
  }>;
}

export class EnhancedEntitlementsService {
  /**
   * Feature catalog - defines what each tier can access
   */
  private readonly features: Record<string, Feature> = {
    // Pathway features (Free tier)
    'access-learning': {
      id: 'access-learning',
      name: 'Learning Access',
      description: 'Access to basic learning programs',
      tier: 'pathway',
    },
    'access-community': {
      id: 'access-community',
      name: 'Community Access',
      description: 'Participate in community forums',
      tier: 'pathway',
    },
    'access-resources': {
      id: 'access-resources',
      name: 'Resource Library',
      description: 'Access basic resources and templates',
      tier: 'pathway',
    },
    'view-leaders': {
      id: 'view-leaders',
      name: 'View Leaders',
      description: 'View PBT local leaders',
      tier: 'pathway',
    },

    // Plus features
    'access-premium-resources': {
      id: 'access-premium-resources',
      name: 'Premium Resources',
      description: 'Access to premium templates and toolkits',
      tier: 'plus',
    },
    'access-events': {
      id: 'access-events',
      name: 'Event Access',
      description: 'Register for and attend live events',
      tier: 'plus',
    },
    'download-resources': {
      id: 'download-resources',
      name: 'Download Resources',
      description: 'Download resources for offline use',
      tier: 'plus',
    },
    'access-replay': {
      id: 'access-replay',
      name: 'Event Replays',
      description: 'Access to recorded event replays',
      tier: 'plus',
    },
    'priority-support': {
      id: 'priority-support',
      name: 'Priority Support',
      description: 'Priority email support',
      tier: 'plus',
    },

    // Mentorship features
    'access-mentors': {
      id: 'access-mentors',
      name: 'Mentor Access',
      description: 'Access to mentorship program',
      tier: 'mentorship',
    },
    'schedule-sessions': {
      id: 'schedule-sessions',
      name: 'Schedule Sessions',
      description: 'Schedule 1:1 mentor sessions',
      tier: 'mentorship',
    },
    'access-power-team': {
      id: 'access-power-team',
      name: 'Power Team Access',
      description: 'Access to power team professionals',
      tier: 'mentorship',
    },
    'exclusive-content': {
      id: 'exclusive-content',
      name: 'Exclusive Content',
      description: 'Access to exclusive mentorship content',
      tier: 'mentorship',
    },
    'priority-mentorship': {
      id: 'priority-mentorship',
      name: 'Priority Mentorship',
      description: 'Priority mentorship scheduling',
      tier: 'mentorship',
    },
    'vip-support': {
      id: 'vip-support',
      name: 'VIP Support',
      description: '24/7 VIP support',
      tier: 'mentorship',
    },
  };

  /**
   * Tier hierarchy - determines feature inheritance
   */
  private readonly tierHierarchy: Record<string, number> = {
    pathway: 1,
    plus: 2,
    mentorship: 3,
  };

  /**
   * Check if user can access a specific feature
   */
  async canAccess(userId: string, featureId: string): Promise<EntitlementCheck> {
    try {
      const feature = this.features[featureId];
      if (!feature) {
        logger.warn('Unknown feature requested', { userId, featureId });
        return { canAccess: false, tier: 'none', reason: 'Feature does not exist' };
      }

      const subscription = await subscriptionService.getCurrentSubscription(userId);

      if (!subscription) {
        return {
          canAccess: feature.tier === 'pathway',
          tier: 'none',
          reason: 'No active subscription',
          suggestedUpgrade: 'plus',
        };
      }

      const hasAccess = this.tierHierarchy[subscription.tier] >= this.tierHierarchy[feature.tier];

      if (!hasAccess) {
        return {
          canAccess: false,
          tier: subscription.tier,
          reason: `This feature requires ${feature.tier} tier or higher`,
          suggestedUpgrade: this.getNextTier(subscription.tier),
        };
      }

      return {
        canAccess: true,
        tier: subscription.tier,
      };
    } catch (error) {
      logger.error('Failed to check access', { userId, featureId, error });
      return { canAccess: false, tier: 'none', reason: 'Access check failed' };
    }
  }

  /**
   * Get all accessible features for a user
   */
  async getAccessibleFeatures(userId: string): Promise<Feature[]> {
    try {
      const subscription = await subscriptionService.getCurrentSubscription(userId);

      const userTier = subscription ? subscription.tier : 'pathway';
      const userTierLevel = this.tierHierarchy[userTier];

      return Object.values(this.features).filter((feature) => this.tierHierarchy[feature.tier] <= userTierLevel);
    } catch (error) {
      logger.error('Failed to get accessible features', { userId, error });
      return [];
    }
  }

  /**
   * Get features by tier
   */
  getFeaturesByTier(tier: 'pathway' | 'plus' | 'mentorship'): Feature[] {
    return Object.values(this.features).filter((feature) => {
      const featureTierLevel = this.tierHierarchy[feature.tier];
      const tierLevel = this.tierHierarchy[tier];
      return featureTierLevel <= tierLevel;
    });
  }

  /**
   * Compare features between tiers
   */
  compareFeatures(tiers: ('pathway' | 'plus' | 'mentorship')[]): Record<string, Record<string, boolean>> {
    const comparison: Record<string, Record<string, boolean>> = {};

    Object.values(this.features).forEach((feature) => {
      comparison[feature.id] = {};
      tiers.forEach((tier) => {
        const tierLevel = this.tierHierarchy[tier];
        const featureTierLevel = this.tierHierarchy[feature.tier];
        comparison[feature.id][tier] = featureTierLevel <= tierLevel;
      });
    });

    return comparison;
  }

  /**
   * Get upgrade suggestions
   */
  async getUpgradeSuggestions(userId: string): Promise<UpgradePath | null> {
    try {
      const subscription = await subscriptionService.getCurrentSubscription(userId);

      if (!subscription) {
        return {
          currentTier: 'none',
          possibleUpgrades: [
            {
              tier: 'pathway',
              cost: 0,
              newFeatures: this.getFeaturesByTier('pathway').map((f) => f.name),
            },
            {
              tier: 'plus',
              cost: await subscriptionService.getPriceForTier('plus', 'monthly'),
              newFeatures: this.getFeaturesByTier('plus')
                .filter((f) => this.tierHierarchy[f.tier] > this.tierHierarchy['pathway'])
                .map((f) => f.name),
            },
            {
              tier: 'mentorship',
              cost: await subscriptionService.getPriceForTier('mentorship', 'monthly'),
              newFeatures: this.getFeaturesByTier('mentorship')
                .filter((f) => this.tierHierarchy[f.tier] > this.tierHierarchy['plus'])
                .map((f) => f.name),
            },
          ],
        };
      }

      const upgrades = [];

      if (subscription.tier !== 'plus') {
        upgrades.push({
          tier: 'plus',
          cost: await subscriptionService.getPriceForTier('plus', subscription.billingCycle),
          newFeatures: this.getFeaturesByTier('plus')
            .filter((f) => this.tierHierarchy[f.tier] > this.tierHierarchy[subscription.tier])
            .map((f) => f.name),
        });
      }

      if (subscription.tier !== 'mentorship') {
        upgrades.push({
          tier: 'mentorship',
          cost: await subscriptionService.getPriceForTier('mentorship', subscription.billingCycle),
          newFeatures: this.getFeaturesByTier('mentorship')
            .filter((f) => this.tierHierarchy[f.tier] > this.tierHierarchy[subscription.tier])
            .map((f) => f.name),
        });
      }

      return {
        currentTier: subscription.tier,
        possibleUpgrades: upgrades,
      };
    } catch (error) {
      logger.error('Failed to get upgrade suggestions', { userId, error });
      return null;
    }
  }

  /**
   * Check if feature requires upgrade
   */
  featureRequiresUpgrade(currentTier: 'pathway' | 'plus' | 'mentorship' | 'none', featureId: string): boolean {
    const feature = this.features[featureId];
    if (!feature) return false;

    const currentTierLevel = currentTier === 'none' ? 0 : this.tierHierarchy[currentTier];
    const featureTierLevel = this.tierHierarchy[feature.tier];

    return featureTierLevel > currentTierLevel;
  }

  /**
   * Get next tier in hierarchy
   */
  private getNextTier(currentTier: string): 'plus' | 'mentorship' | undefined {
    if (currentTier === 'pathway') return 'plus';
    if (currentTier === 'plus') return 'mentorship';
    return undefined;
  }

  /**
   * Get feature by ID
   */
  getFeatureById(featureId: string): Feature | undefined {
    return this.features[featureId];
  }

  /**
   * List all features
   */
  getAllFeatures(): Feature[] {
    return Object.values(this.features);
  }

  /**
   * Bulk check features
   */
  async checkMultipleFeatures(userId: string, featureIds: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const featureId of featureIds) {
      const result = await this.canAccess(userId, featureId);
      results[featureId] = result.canAccess;
    }

    return results;
  }
}

export const enhancedEntitlementsService = new EnhancedEntitlementsService();

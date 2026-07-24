import { logger } from '@/core/logger/logger';
import { AppError } from '@/core/errors/AppError';
import { ErrorCode } from '@/shared/errorCodes';

export enum SubscriptionTier {
  FREE = 'free',
  PATHWAY = 'pbt-pathway',
  PLUS = 'pbt-plus',
  MENTORSHIP = 'pbt-mentorship',
}

export interface Entitlements {
  // Learning
  canAccessLearning: boolean;
  canAccessPremiumLessons: boolean;
  canDownloadResources: boolean;
  canAccessCertificates: boolean;
  maxSimultaneousPrograms: number;

  // Events
  canAccessEvents: boolean;
  canAccessEventReplays: boolean;
  canAccessPremiumEvents: boolean;

  // Community
  canAccessCommunity: boolean;
  canCreateThreads: boolean;
  canModerateThreads: boolean;

  // Resources
  canAccessAllResources: boolean;
  canAccessPremiumResources: boolean;
  resourceDownloadLimit: number;

  // Mentorship
  canAccessMentors: boolean;
  canBookMentorSessions: boolean;
  mentorSessionsPerMonth: number;
  canAccessGroupMentorship: boolean;

  // Power Team
  canAccessPowerTeam: boolean;
  canAccessVerifiedTeam: boolean;

  // Analytics
  canAccessAnalytics: boolean;
  canAccessAdvancedAnalytics: boolean;

  // Support
  supportTier: 'none' | 'email' | 'priority' | 'dedicated';
  prioritySupport: boolean;

  // Advanced Features
  canUseAPI: boolean;
  apiCallsPerDay: number;
  canIntegrate: boolean;
}

/**
 * Entitlements Service
 * Centralized service for determining member entitlements based on subscription tier
 * 
 * This service ensures that:
 * 1. No controller directly implements subscription logic
 * 2. Entitlements are managed centrally
 * 3. Subscription inheritance is properly enforced
 * 4. All permissions flow from entitlements
 */
export class EntitlementsService {
  /**
   * Get entitlements for a subscription tier
   * 
   * Subscription Hierarchy:
   * - PBT Mentorship (includes Plus & Pathway)
   * - PBT Plus (includes Pathway)
   * - PBT Pathway
   * - Free (no special entitlements)
   */
  static getEntitlements(subscriptionTier: SubscriptionTier): Entitlements {
    switch (subscriptionTier) {
      case SubscriptionTier.MENTORSHIP:
        return this.getMentorshipEntitlements();

      case SubscriptionTier.PLUS:
        return this.getPlusEntitlements();

      case SubscriptionTier.PATHWAY:
        return this.getPathwayEntitlements();

      case SubscriptionTier.FREE:
      default:
        return this.getFreeEntitlements();
    }
  }

  /**
   * Free tier entitlements (limited access)
   */
  private static getFreeEntitlements(): Entitlements {
    return {
      // Learning
      canAccessLearning: true,
      canAccessPremiumLessons: false,
      canDownloadResources: false,
      canAccessCertificates: false,
      maxSimultaneousPrograms: 1,

      // Events
      canAccessEvents: true,
      canAccessEventReplays: false,
      canAccessPremiumEvents: false,

      // Community
      canAccessCommunity: true,
      canCreateThreads: true,
      canModerateThreads: false,

      // Resources
      canAccessAllResources: false,
      canAccessPremiumResources: false,
      resourceDownloadLimit: 0,

      // Mentorship
      canAccessMentors: false,
      canBookMentorSessions: false,
      mentorSessionsPerMonth: 0,
      canAccessGroupMentorship: false,

      // Power Team
      canAccessPowerTeam: false,
      canAccessVerifiedTeam: false,

      // Analytics
      canAccessAnalytics: false,
      canAccessAdvancedAnalytics: false,

      // Support
      supportTier: 'none',
      prioritySupport: false,

      // API
      canUseAPI: false,
      apiCallsPerDay: 0,
      canIntegrate: false,
    };
  }

  /**
   * PBT Pathway entitlements (entry-level)
   */
  private static getPathwayEntitlements(): Entitlements {
    return {
      // Learning
      canAccessLearning: true,
      canAccessPremiumLessons: true,
      canDownloadResources: true,
      canAccessCertificates: true,
      maxSimultaneousPrograms: 2,

      // Events
      canAccessEvents: true,
      canAccessEventReplays: true,
      canAccessPremiumEvents: false,

      // Community
      canAccessCommunity: true,
      canCreateThreads: true,
      canModerateThreads: false,

      // Resources
      canAccessAllResources: true,
      canAccessPremiumResources: false,
      resourceDownloadLimit: 10,

      // Mentorship
      canAccessMentors: false,
      canBookMentorSessions: false,
      mentorSessionsPerMonth: 0,
      canAccessGroupMentorship: false,

      // Power Team
      canAccessPowerTeam: true,
      canAccessVerifiedTeam: false,

      // Analytics
      canAccessAnalytics: false,
      canAccessAdvancedAnalytics: false,

      // Support
      supportTier: 'email',
      prioritySupport: false,

      // API
      canUseAPI: false,
      apiCallsPerDay: 0,
      canIntegrate: false,
    };
  }

  /**
   * PBT Plus entitlements (mid-level - includes Pathway)
   */
  private static getPlusEntitlements(): Entitlements {
    // Start with Pathway entitlements, then upgrade
    const pathwayEntitlements = this.getPathwayEntitlements();

    return {
      ...pathwayEntitlements,

      // Learning (upgraded)
      maxSimultaneousPrograms: 5,

      // Events (upgraded)
      canAccessPremiumEvents: true,

      // Resources (upgraded)
      canAccessPremiumResources: true,
      resourceDownloadLimit: 50,

      // Mentorship (added)
      canAccessMentors: true,
      canBookMentorSessions: true,
      mentorSessionsPerMonth: 2,
      canAccessGroupMentorship: true,

      // Power Team (upgraded)
      canAccessVerifiedTeam: true,

      // Analytics (added)
      canAccessAnalytics: true,
      canAccessAdvancedAnalytics: false,

      // Support (upgraded)
      supportTier: 'priority',
      prioritySupport: true,

      // API (added)
      canUseAPI: true,
      apiCallsPerDay: 1000,
      canIntegrate: false,
    };
  }

  /**
   * PBT Mentorship entitlements (premium - includes Plus & Pathway)
   */
  private static getMentorshipEntitlements(): Entitlements {
    // Start with Plus entitlements, then upgrade
    const plusEntitlements = this.getPlusEntitlements();

    return {
      ...plusEntitlements,

      // Learning (unlimited)
      maxSimultaneousPrograms: 999,

      // Resources (unlimited)
      canAccessPremiumResources: true,
      resourceDownloadLimit: 999,

      // Mentorship (premium)
      mentorSessionsPerMonth: 8,

      // Analytics (premium)
      canAccessAdvancedAnalytics: true,

      // Support (dedicated)
      supportTier: 'dedicated',
      prioritySupport: true,

      // API (premium)
      apiCallsPerDay: 10000,
      canIntegrate: true,
    };
  }

  /**
   * Check if member can access specific feature
   * Used in controllers and middleware
   */
  static async canAccess(
    subscriptionTier: SubscriptionTier,
    feature: keyof Entitlements
  ): Promise<boolean> {
    const entitlements = this.getEntitlements(subscriptionTier);
    const value = entitlements[feature];

    if (typeof value === 'boolean') {
      return value;
    }

    // For numeric values, return true if > 0
    if (typeof value === 'number') {
      return value > 0;
    }

    return false;
  }

  /**
   * Verify member has specific entitlement
   * Throws error if not entitled
   */
  static async requireAccess(
    subscriptionTier: SubscriptionTier,
    feature: keyof Entitlements,
    errorMessage?: string
  ): Promise<void> {
    const hasAccess = await this.canAccess(subscriptionTier, feature);

    if (!hasAccess) {
      logger.warn('Entitlement access denied', {
        tier: subscriptionTier,
        feature,
      });

      throw new AppError(
        ErrorCode.ENTITLEMENT_NOT_GRANTED,
        errorMessage || `You do not have access to this feature. Feature requires higher membership tier.`,
        403
      );
    }
  }

  /**
   * Get upgrade suggestions for member based on desired feature
   */
  static suggestUpgrade(desiredFeature: keyof Entitlements): SubscriptionTier[] {
    const suggestions: SubscriptionTier[] = [];

    // Check which tiers have this entitlement
    const pathwayEntitlements = this.getPathwayEntitlements();
    const plusEntitlements = this.getPlusEntitlements();
    const mentorshipEntitlements = this.getMentorshipEntitlements();

    if (this.hasFeature(pathwayEntitlements, desiredFeature)) {
      suggestions.push(SubscriptionTier.PATHWAY);
    }

    if (this.hasFeature(plusEntitlements, desiredFeature)) {
      suggestions.push(SubscriptionTier.PLUS);
    }

    if (this.hasFeature(mentorshipEntitlements, desiredFeature)) {
      suggestions.push(SubscriptionTier.MENTORSHIP);
    }

    // Return minimum required tier
    if (suggestions.includes(SubscriptionTier.PATHWAY)) return [SubscriptionTier.PATHWAY];
    if (suggestions.includes(SubscriptionTier.PLUS)) return [SubscriptionTier.PLUS];
    if (suggestions.includes(SubscriptionTier.MENTORSHIP)) return [SubscriptionTier.MENTORSHIP];

    return [];
  }

  /**
   * Helper to check if feature is enabled in entitlements
   */
  private static hasFeature(entitlements: Entitlements, feature: keyof Entitlements): boolean {
    const value = entitlements[feature];

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value > 0;
    }

    return false;
  }

  /**
   * Get entitlement details for comparison (e.g., pricing page)
   */
  static getFeatureComparison(): Record<SubscriptionTier, Entitlements> {
    return {
      [SubscriptionTier.FREE]: this.getFreeEntitlements(),
      [SubscriptionTier.PATHWAY]: this.getPathwayEntitlements(),
      [SubscriptionTier.PLUS]: this.getPlusEntitlements(),
      [SubscriptionTier.MENTORSHIP]: this.getMentorshipEntitlements(),
    };
  }

  /**
   * List all features (for frontend UI)
   */
  static listAllFeatures(): {
    category: string;
    features: Array<{
      key: keyof Entitlements;
      label: string;
      description: string;
    }>;
  }[] {
    return [
      {
        category: 'Learning',
        features: [
          {
            key: 'canAccessLearning',
            label: 'Access Learning Programs',
            description: 'Browse and enroll in training programs',
          },
          {
            key: 'canAccessPremiumLessons',
            label: 'Premium Lessons',
            description: 'Access advanced and exclusive lessons',
          },
          {
            key: 'maxSimultaneousPrograms',
            label: 'Simultaneous Programs',
            description: 'Number of programs you can enroll in at once',
          },
          {
            key: 'canAccessCertificates',
            label: 'Certificates',
            description: 'Earn certificates upon program completion',
          },
        ],
      },
      {
        category: 'Events',
        features: [
          {
            key: 'canAccessEvents',
            label: 'Event Access',
            description: 'Register and attend events',
          },
          {
            key: 'canAccessEventReplays',
            label: 'Event Replays',
            description: 'Watch recordings of past events',
          },
          {
            key: 'canAccessPremiumEvents',
            label: 'Premium Events',
            description: 'Access exclusive premium events',
          },
        ],
      },
      {
        category: 'Mentorship',
        features: [
          {
            key: 'canAccessMentors',
            label: 'Mentor Access',
            description: 'Connect with PBT mentors',
          },
          {
            key: 'canBookMentorSessions',
            label: 'Book Sessions',
            description: 'Schedule 1-on-1 mentor sessions',
          },
          {
            key: 'mentorSessionsPerMonth',
            label: 'Sessions Per Month',
            description: 'Number of mentor sessions per month',
          },
        ],
      },
      {
        category: 'Resources',
        features: [
          {
            key: 'canAccessAllResources',
            label: 'Resource Library',
            description: 'Access templates, guides, and documents',
          },
          {
            key: 'resourceDownloadLimit',
            label: 'Downloads Per Month',
            description: 'Number of resource downloads allowed',
          },
        ],
      },
      {
        category: 'Support',
        features: [
          {
            key: 'supportTier',
            label: 'Support Level',
            description: 'Priority and response times for support',
          },
        ],
      },
    ];
  }
}

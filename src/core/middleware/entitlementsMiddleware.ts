import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/core/errors/AppError';
import { ErrorCode } from '@/shared/errorCodes';
import { EntitlementsService } from '@/modules/entitlements/services/entitlements.service';
import { logger } from '@/core/logger/logger';

/**
 * Extend Express Request to include subscription tier
 */
declare global {
  namespace Express {
    interface Request {
      subscriptionTier?: string;
      entitlements?: any;
    }
  }
}

/**
 * Middleware to check if member has required entitlement
 * Usage: app.get('/premium', requireEntitlement('canAccessPremiumResources'), handler)
 */
export function requireEntitlement(feature: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscriptionTier = req.subscriptionTier || 'free';

      const hasAccess = await EntitlementsService.canAccess(
        subscriptionTier as any,
        feature as any
      );

      if (!hasAccess) {
        logger.warn('Entitlement check failed', {
          userId: (req as any).user?.id,
          feature,
          tier: subscriptionTier,
          correlationId: req.id,
        });

        // Suggest upgrade
        const suggestedTiers = EntitlementsService.suggestUpgrade(feature as any);

        throw new AppError(
          ErrorCode.ENTITLEMENT_NOT_GRANTED,
          `This feature requires an upgrade. ${suggestedTiers.length > 0 ? `Upgrade to ${suggestedTiers[0]} to access this.` : ''}`,
          403
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to attach entitlements to request
 * Should be called after authentication middleware
 */
export function loadEntitlements() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscriptionTier = req.subscriptionTier || 'free';
      req.entitlements = EntitlementsService.getEntitlements(subscriptionTier as any);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to check rate limiting based on subscription tier
 */
export function rateByTier(
  options: Record<string, number> = {
    free: 10,
    'pbt-pathway': 50,
    'pbt-plus': 200,
    'pbt-mentorship': 1000,
  }
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tier = req.subscriptionTier || 'free';
    const limit = options[tier] || options['free'];

    logger.debug('Rate limiting by tier', {
      tier,
      limit,
      userId: (req as any).user?.id,
    });

    // Implement rate limiting logic here if needed
    next();
  };
}

/**
 * Validate member has minimum subscription tier
 */
export function requireMinimumTier(minimumTier: 'free' | 'pbt-pathway' | 'pbt-plus' | 'pbt-mentorship') {
  const tierHierarchy = ['free', 'pbt-pathway', 'pbt-plus', 'pbt-mentorship'];
  const minimumIndex = tierHierarchy.indexOf(minimumTier);

  return async (req: Request, res: Response, next: NextFunction) => {
    const userTier = req.subscriptionTier || 'free';
    const userIndex = tierHierarchy.indexOf(userTier);

    if (userIndex < minimumIndex) {
      logger.warn('Minimum tier requirement not met', {
        userId: (req as any).user?.id,
        required: minimumTier,
        current: userTier,
      });

      throw new AppError(
        ErrorCode.MEMBERSHIP_UPGRADE_REQUIRED,
        `This feature requires ${minimumTier} membership. Please upgrade to continue.`,
        403
      );
    }

    next();
  };
}

/**
 * Middleware to log feature access (for analytics)
 */
export function logFeatureAccess(feature: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    logger.info('Feature accessed', {
      feature,
      userId: (req as any).user?.id,
      tier: req.subscriptionTier,
      path: req.path,
      correlationId: req.id,
    });
    next();
  };
}

/**
 * Check entitlement and attach suggestions to response
 */
export function attachUpgradeSuggestions(feature: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const suggestions = EntitlementsService.suggestUpgrade(feature as any);

    // Attach to response locals so it can be included in response
    res.locals.upgradeSuggestions = suggestions;

    next();
  };
}

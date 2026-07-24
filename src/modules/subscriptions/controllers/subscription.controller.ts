import { Request, Response } from 'express';
import { subscriptionService } from '@/modules/subscriptions/services/subscription.service';
import { enhancedEntitlementsService } from '@/modules/entitlements/services/entitlements.service.enhanced';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { asyncHandler } from '@/core/middleware/asyncHandler';
import { auditService } from '@/modules/audit/services/audit.service';

export class SubscriptionController {
  /**
   * Get current subscription
   */
  getCurrentSubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    const subscription = await subscriptionService.getCurrentSubscription(userId);

    if (!subscription) {
      return ResponseHandler.success(res, null, 'No active subscription');
    }

    ResponseHandler.success(res, subscription, 'Subscription retrieved successfully');
  });

  /**
   * Get all available plans
   */
  getAvailablePlans = asyncHandler(async (req: Request, res: Response) => {
    const hierarchy = subscriptionService.getTierHierarchy();
    const plans = Object.entries(hierarchy).map(([tier, data]) => ({
      tier,
      name: data.name,
      price: {
        monthly: subscriptionService.getPriceForTier(tier as any, 'monthly'),
        annual: subscriptionService.getPriceForTier(tier as any, 'annual'),
      },
      features: data.features,
    }));

    ResponseHandler.success(res, plans, 'Plans retrieved successfully');
  });

  /**
   * Upgrade subscription
   */
  upgradeSubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const { newTier } = req.body;
    const ipAddress = req.ip || '';
    const userAgent = req.get('user-agent') || '';
    const correlationId = (req as any).correlationId;

    const updated = await subscriptionService.upgradeSubscription(userId, newTier);

    await auditService.logSubscriptionEvent(
      userId,
      'SUBSCRIPTION_UPGRADED',
      updated._id.toString(),
      { newTier, previousTier: updated.tier },
      ipAddress,
      userAgent,
      correlationId
    );

    ResponseHandler.success(res, updated, 'Subscription upgraded successfully', 201);
  });

  /**
   * Downgrade subscription
   */
  downgradeSubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const { newTier } = req.body;
    const ipAddress = req.ip || '';
    const userAgent = req.get('user-agent') || '';
    const correlationId = (req as any).correlationId;

    const updated = await subscriptionService.downgradeSubscription(userId, newTier);

    await auditService.logSubscriptionEvent(
      userId,
      'SUBSCRIPTION_DOWNGRADED',
      updated._id.toString(),
      { newTier, previousTier: updated.tier },
      ipAddress,
      userAgent,
      correlationId
    );

    ResponseHandler.success(res, updated, 'Subscription downgraded successfully');
  });

  /**
   * Cancel subscription
   */
  cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const ipAddress = req.ip || '';
    const userAgent = req.get('user-agent') || '';
    const correlationId = (req as any).correlationId;

    const subscription = await subscriptionService.cancelSubscription(userId);

    await auditService.logSubscriptionEvent(
      userId,
      'SUBSCRIPTION_CANCELLED',
      subscription?._id.toString() || '',
      { tier: subscription?.tier },
      ipAddress,
      userAgent,
      correlationId
    );

    ResponseHandler.success(res, subscription, 'Subscription cancelled successfully');
  });

  /**
   * Compare subscription features
   */
  compareFeatures = asyncHandler(async (req: Request, res: Response) => {
    const { tiers } = req.query;

    const tierArray = (typeof tiers === 'string' ? tiers.split(',') : tiers) as (
      | 'pathway'
      | 'plus'
      | 'mentorship'
    )[];

    const comparison = enhancedEntitlementsService.compareFeatures(tierArray);

    ResponseHandler.success(res, comparison, 'Features compared successfully');
  });

  /**
   * Get upgrade suggestions
   */
  getUpgradeSuggestions = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    const suggestions = await enhancedEntitlementsService.getUpgradeSuggestions(userId);

    ResponseHandler.success(res, suggestions, 'Upgrade suggestions retrieved successfully');
  });
}

export const subscriptionController = new SubscriptionController();

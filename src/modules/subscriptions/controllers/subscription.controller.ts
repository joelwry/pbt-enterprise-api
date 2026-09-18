import { Request, Response } from 'express';
import { subscriptionService } from '@/modules/subscriptions/services/subscription.service';
import { generateReceiptPdf } from '@/modules/subscriptions/services/receipt.service';
import { SubscriptionDocument } from '@/modules/subscriptions/schemas/Subscription.schema';
import { enhancedEntitlementsService } from '@/modules/entitlements/services/entitlements.service.enhanced';
import { authRepository } from '@/modules/auth/repositories/auth.repository';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { asyncHandler } from '@/core/middleware/asyncHandler';
import { auditService } from '@/modules/audit/services/audit.service';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';

/** Adds the computed `cancelled` flag the frontend gates its Cancel button on. */
function toSubscriptionDto(subscription: SubscriptionDocument) {
  return { ...subscription.toObject(), cancelled: Boolean(subscription.cancelledAt) };
}

export class SubscriptionController {
  /**
   * Get current subscription
   */
  getCurrentSubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;

    const subscription = await subscriptionService.getCurrentSubscription(userId);

    if (!subscription) {
      ResponseHandler.ok(res, 'No active subscription', null);
      return;
    }

    ResponseHandler.ok(res, 'Subscription retrieved successfully', toSubscriptionDto(subscription));
  });

  /**
   * Member's own billing history, paginated, projected into invoice rows.
   */
  getInvoices = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const { page, limit } = PaginationHelper.parse({ page: req.query.page as string, limit: req.query.limit as string });

    const { items, totalItems } = await subscriptionService.getBillingHistory(userId, page, limit);

    const invoices = items.map((sub) => ({
      id: sub._id.toString(),
      invoiceNumber: `INV-${sub.createdAt.getFullYear()}-${sub._id.toString().slice(-6).toUpperCase()}`,
      dateLabel: sub.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      amountLabel: `£${sub.amount.toFixed(2)}`,
      status: 'Paid' as const,
    }));

    ResponseHandler.paginated(res, 200, 'Billing history retrieved successfully', invoices, PaginationHelper.createMeta(page, limit, totalItems));
  });

  /**
   * Branded PDF receipt for one billing-history record. Scoped to the
   * requesting member -- getOwnedBillingRecord returns null for a record
   * that exists but belongs to someone else, same as "doesn't exist".
   */
  downloadReceipt = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const { invoiceId } = req.params;

    const [subscription, user] = await Promise.all([
      subscriptionService.getOwnedBillingRecord(userId, invoiceId),
      authRepository.findById(userId),
    ]);

    if (!subscription || !user) {
      ResponseHandler.notFound(res, 'Receipt not found');
      return;
    }

    const pdf = await generateReceiptPdf(subscription, user);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PBT-Receipt-${subscription._id.toString().slice(-6).toUpperCase()}.pdf"`);
    res.send(pdf);
  });

  /**
   * Get all available plans
   */
  getAvailablePlans = asyncHandler(async (req: Request, res: Response) => {
    const hierarchy = subscriptionService.getTierHierarchy();
    const plans = await Promise.all(
      Object.entries(hierarchy).map(async ([tier, data]) => ({
        tier,
        name: data.name,
        price: {
          monthly: await subscriptionService.getPriceForTier(tier as any, 'monthly'),
          annual: await subscriptionService.getPriceForTier(tier as any, 'annual'),
        },
        features: data.features,
      }))
    );

    ResponseHandler.ok(res, 'Plans retrieved successfully', plans);
  });

  /**
   * Upgrade subscription
   */
  upgradeSubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
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

    ResponseHandler.created(res, 'Subscription upgraded successfully', updated);
  });

  /**
   * Downgrade subscription
   */
  downgradeSubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
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

    ResponseHandler.ok(res, 'Subscription downgraded successfully', updated);
  });

  /**
   * Cancel subscription
   */
  cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
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

    ResponseHandler.ok(res, 'Subscription cancelled successfully', { cancelled: Boolean(subscription?.cancelledAt) });
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

    ResponseHandler.ok(res, 'Features compared successfully', comparison);
  });

  /**
   * Get upgrade suggestions
   */
  getUpgradeSuggestions = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;

    const suggestions = await enhancedEntitlementsService.getUpgradeSuggestions(userId);

    ResponseHandler.ok(res, 'Upgrade suggestions retrieved successfully', suggestions);
  });
}

export const subscriptionController = new SubscriptionController();

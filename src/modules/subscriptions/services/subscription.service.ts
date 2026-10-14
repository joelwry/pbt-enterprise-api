import { Subscription, SubscriptionDocument } from '@/modules/subscriptions/schemas/Subscription.schema';
import { User } from '@/modules/users/schemas/User.schema';
import { pricingService } from '@/modules/pricing/services/pricing.service';
import { AppError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';
import { Types } from 'mongoose';

/**
 * Whether a subscription currently entitles its member to access -- active
 * status and not yet past its endDate. Module-level (not a class method) so
 * it can be imported without instantiating SubscriptionService; also used
 * by admin-members.service.ts to derive a member's real tier/status
 * instead of re-deriving entitlement a second, potentially inconsistent way.
 */
export function isEntitled(sub: SubscriptionDocument | null): boolean {
  return sub !== null && sub.status === 'active' && sub.endDate > new Date();
}

/** Latest Subscription per user (any status) -- shared by admin-members (tier/status resolution) and this service's own admin stats (failed-payments count), so both use the exact same "most recent subscription" definition. */
export async function mostRecentSubscriptionsFor(userIds: (string | Types.ObjectId)[]): Promise<Map<string, SubscriptionDocument>> {
  const subs = await Subscription.find({ userId: { $in: userIds } }).sort({ endDate: -1 });
  const byUser = new Map<string, SubscriptionDocument>();
  for (const sub of subs) {
    const key = sub.userId.toString();
    if (!byUser.has(key)) byUser.set(key, sub);
  }
  return byUser;
}

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
      throw new AppError(500, 'Failed to retrieve subscription', ['ERR_5001']);
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
      throw new AppError(500, 'Failed to retrieve subscription', ['ERR_5001']);
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
      throw new AppError(500, 'Failed to create subscription', ['ERR_5002']);
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
        throw new AppError(404, 'No active subscription found', ['ERR_4010']);
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
        throw new AppError(400, 'Can only upgrade to a higher tier', ['ERR_3001']);
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
        await this.getPriceForTier(newTier, currentSubscription.billingCycle)
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to upgrade subscription', { userId, newTier, error });
      throw new AppError(500, 'Failed to upgrade subscription', ['ERR_5003']);
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
        throw new AppError(404, 'No active subscription found', ['ERR_4010']);
      }

      const tierHierarchy: Record<string, number> = {
        pathway: 1,
        plus: 2,
        mentorship: 3,
      };

      const currentTierLevel = tierHierarchy[currentSubscription.tier];
      const newTierLevel = tierHierarchy[newTier];

      if (newTierLevel >= currentTierLevel) {
        throw new AppError(400, 'Can only downgrade to a lower tier', ['ERR_3001']);
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
        await this.getPriceForTier(newTier, currentSubscription.billingCycle)
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to downgrade subscription', { userId, newTier, error });
      throw new AppError(500, 'Failed to downgrade subscription', ['ERR_5004']);
    }
  }

  /**
   * Cancel subscription -- a voluntary cancellation stops auto-renewal but
   * does not revoke access immediately: the member keeps full access until
   * `endDate`, matching the member portal's own "you'll keep access until
   * {date}" messaging. `status` stays 'active' so getCurrentSubscription
   * (and every tier-gate built on it) keeps working normally until the
   * subscription naturally lapses at endDate.
   */
  async cancelSubscription(userId: string): Promise<SubscriptionDocument | null> {
    try {
      const subscription = await this.getCurrentSubscription(userId);

      if (!subscription) {
        throw new AppError(404, 'No active subscription found', ['ERR_4010']);
      }

      subscription.autoRenew = false;
      subscription.cancelledAt = new Date();
      const updated = await subscription.save();

      logger.info('Subscription cancelled (will not renew)', { userId, tier: subscription.tier });
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to cancel subscription', { userId, error });
      throw new AppError(500, 'Failed to cancel subscription', ['ERR_5005']);
    }
  }

  /**
   * A member's own billing history -- every subscription record they've ever
   * had (active, cancelled, expired), most recent first. Each one doubles as
   * an "invoice" row since there's no separate payment-gateway invoice
   * record yet (see docs/pbt_integration_progress_log.md for the Stripe
   * follow-up this is deferred to).
   */
  async getBillingHistory(userId: string, page: number, limit: number) {
    const filter = { userId: new Types.ObjectId(userId) };
    const [items, totalItems] = await Promise.all([
      Subscription.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Subscription.countDocuments(filter),
    ]);
    return { items, totalItems };
  }

  /**
   * A single billing-history record, scoped to its owner -- used for the
   * receipt download. Returns null (not just any record) if it exists but
   * belongs to someone else, so the controller can 404 either way without
   * leaking whether the id exists at all.
   */
  async getOwnedBillingRecord(userId: string, subscriptionId: string): Promise<SubscriptionDocument | null> {
    return Subscription.findOne({ _id: subscriptionId, userId: new Types.ObjectId(userId) });
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
        name: 'PBT Masterplan Programme',
        features: ['basic-learning', 'community-access', 'resource-library', 'premium-resources', 'event-access', 'mentorship-access', 'power-team-access'],
      },
    };
  }

  /**
   * Real, admin-overridable pricing (see modules/pricing/services/pricing.service.ts)
   * -- this is the one place the rest of the backend asks "what does this
   * tier/cycle cost right now", so an admin pricing change (e.g. a
   * promotional offer) takes effect everywhere without a redeploy.
   */
  async getPriceForTier(tier: 'pathway' | 'plus' | 'mentorship', billingCycle: 'monthly' | 'annual'): Promise<number> {
    const { amount } = await pricingService.getEffectivePrice(tier, billingCycle);
    return amount;
  }

  /**
   * Membership gate for content access — does this member's subscription
   * tier meet or exceed the tier a piece of content requires? Only the tier
   * hierarchy is checked here; time-based release (unlocksAt) is a separate,
   * independent gate enforced by the caller (see learning.service.ts).
   */
  async canAccessTier(userId: string, requiredTier: 'Pathway' | 'Plus' | 'Mentorship'): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) return false;

    const tierHierarchy: Record<string, number> = { pathway: 1, plus: 2, mentorship: 3 };
    const memberLevel = tierHierarchy[subscription.tier];
    const requiredLevel = tierHierarchy[requiredTier.toLowerCase()];

    return memberLevel >= requiredLevel;
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

  /**
   * Admin billing dashboard stats -- all real aggregates over actual
   * Subscription documents.
   *
   * payingMembers previously excluded the 'pathway' tier, as if it were a
   * free tier -- it isn't (it's the entry PAID tier, real price, real
   * Stripe subscriptions), so that undercounted paying members relative to
   * MRR, which already summed every active subscription including
   * Pathway's. Both now count the same set.
   *
   * failedPaymentsCount was hard-coded to 0 with a comment blaming "no
   * real payment gateway yet" -- stale; Stripe has been wired for a while.
   * Now computed the same real way the Members page's "Payment Failed"
   * status already is: an active-account member whose most recent
   * subscription has lapsed (expired/cancelled, past its endDate).
   */
  async getAdminStats() {
    const now = new Date();
    const [activeSubs, cancelledCount, totalCount, activeMemberUsers] = await Promise.all([
      Subscription.find({ status: 'active', endDate: { $gt: now } }),
      // cancelledAt defaults to null (not absent) on every subscription --
      // see Subscription.schema.ts -- so { $exists: true } matched nearly
      // every document regardless of whether it was ever actually
      // cancelled, wildly inflating the churn rate. { $ne: null } is the
      // real "was this ever cancelled" check.
      Subscription.countDocuments({ cancelledAt: { $ne: null } }),
      Subscription.countDocuments({}),
      User.find({ role: 'member', isActive: true }).select('_id'),
    ]);

    const payingMembers = activeSubs.length;

    const mostRecentByUser = await mostRecentSubscriptionsFor(activeMemberUsers.map((u) => u._id));
    const failedPaymentsCount = activeMemberUsers.filter((u) => {
      const sub = mostRecentByUser.get(u._id.toString());
      return sub != null && !isEntitled(sub);
    }).length;

    const mrr = activeSubs.reduce((sum, s) => sum + (s.billingCycle === 'monthly' ? s.amount : s.amount / 12), 0);
    const churnRatePercent = totalCount > 0 ? Math.round((cancelledCount / totalCount) * 1000) / 10 : 0;

    return {
      mrr: Math.round(mrr * 100) / 100,
      mrrDeltaLabel: 'vs. last month',
      payingMembers,
      failedPaymentsCount,
      churnRatePercent,
    };
  }

  /** Real MRR contribution per tier, for the admin revenue breakdown. */
  async getRevenueByTier() {
    const now = new Date();
    const activeSubs = await Subscription.find({ status: 'active', endDate: { $gt: now } });
    const tierNames: Record<string, string> = { pathway: 'PBT Pathway', plus: 'PBT Plus', mentorship: 'PBT Masterplan Programme' };

    const mrrByTier: Record<string, number> = { pathway: 0, plus: 0, mentorship: 0 };
    for (const sub of activeSubs) {
      mrrByTier[sub.tier] += sub.billingCycle === 'monthly' ? sub.amount : sub.amount / 12;
    }
    const totalMrr = mrrByTier.pathway + mrrByTier.plus + mrrByTier.mentorship;

    const segments = await Promise.all(
      (['pathway', 'plus', 'mentorship'] as const).map(async (tier) => {
        const monthlyPrice = await this.getPriceForTier(tier, 'monthly');
        return {
          tier: tier.charAt(0).toUpperCase() + tier.slice(1),
          label: `${tierNames[tier]} — £${monthlyPrice}/mo`,
          priceLabel: `£${monthlyPrice}/mo`,
          percent: totalMrr > 0 ? Math.round((mrrByTier[tier] / totalMrr) * 100) : 0,
        };
      })
    );

    return {
      mrrLabel: `£${Math.round(totalMrr).toLocaleString('en-GB')}`,
      segments,
    };
  }

  /**
   * Admin-facing billing history across every member -- each row is a real
   * Subscription document projected into an invoice shape. Status is always
   * "Paid": there's no real payment-failure or refund tracking without a
   * payment gateway (deferred to the Stripe integration).
   */
  async getAdminInvoices(query: { search?: string; page: number; limit: number }) {
    const { search, page, limit } = query;
    const filter: Record<string, unknown> = {};

    const [items, totalItems] = await Promise.all([
      Subscription.find(filter)
        .populate('userId', 'fullName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Subscription.countDocuments(filter),
    ]);

    // Search is applied post-query against the populated member name --
    // subscriptions don't carry a searchable invoice number of their own.
    const filtered = search?.trim()
      ? items.filter((s: any) => (s.userId?.fullName ?? '').toLowerCase().includes(search.trim().toLowerCase()))
      : items;

    return { items: filtered, totalItems: search?.trim() ? filtered.length : totalItems };
  }
}

export const subscriptionService = new SubscriptionService();

import { Subscription, SubscriptionDocument } from '@/modules/subscriptions/schemas/Subscription.schema';
import { AppError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';
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
        this.getPriceForTier(newTier, currentSubscription.billingCycle)
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
        this.getPriceForTier(newTier, currentSubscription.billingCycle)
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
   * Get price for tier -- matches the frontend's real, consistently-used
   * MEMBERSHIP_TIERS pricing (features/membership/tiers.ts); these are the
   * only prices ever actually shown to a member, so the backend (previously
   * untested/unwired here) is the one reconciled to match. Annual is simply
   * 10 months' worth (2 months free), a placeholder until real annual
   * pricing is decided alongside the Stripe integration.
   */
  getPriceForTier(tier: 'pathway' | 'plus' | 'mentorship', billingCycle: 'monthly' | 'annual'): number {
    const monthly: Record<string, number> = { pathway: 39, plus: 79, mentorship: 149 };
    return billingCycle === 'monthly' ? monthly[tier] : monthly[tier] * 10;
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
   * Subscription documents. failedPaymentsCount is honestly 0: without a
   * real payment gateway there's no way for a payment to actually fail yet
   * (deferred to the Stripe integration, see the progress log).
   */
  async getAdminStats() {
    const now = new Date();
    const [activeSubs, payingMembers, cancelledCount, totalCount] = await Promise.all([
      Subscription.find({ status: 'active', endDate: { $gt: now } }),
      Subscription.countDocuments({ status: 'active', endDate: { $gt: now }, tier: { $ne: 'pathway' } }),
      Subscription.countDocuments({ cancelledAt: { $exists: true } }),
      Subscription.countDocuments({}),
    ]);

    const mrr = activeSubs.reduce((sum, s) => sum + (s.billingCycle === 'monthly' ? s.amount : s.amount / 12), 0);
    const churnRatePercent = totalCount > 0 ? Math.round((cancelledCount / totalCount) * 1000) / 10 : 0;

    return {
      mrr: Math.round(mrr * 100) / 100,
      mrrDeltaLabel: 'vs. last month',
      payingMembers,
      failedPaymentsCount: 0,
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

    const segments = (['pathway', 'plus', 'mentorship'] as const).map((tier) => ({
      tier: tier.charAt(0).toUpperCase() + tier.slice(1),
      label: `${tierNames[tier]} — £${this.getPriceForTier(tier, 'monthly')}/mo`,
      priceLabel: `£${this.getPriceForTier(tier, 'monthly')}/mo`,
      percent: totalMrr > 0 ? Math.round((mrrByTier[tier] / totalMrr) * 100) : 0,
    }));

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

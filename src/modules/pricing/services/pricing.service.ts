import { Types } from 'mongoose';
import { TierPricing, TierPricingDocument } from '@/modules/pricing/schemas/TierPricing.schema';
import { StripeService, BillingTier, BillingCycle } from '@/core/payments/StripeService';
import { NotFoundError, ValidationError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

export const TIER_LABEL: Record<BillingTier, string> = {
  pathway: 'PBT Pathway',
  plus: 'PBT Plus',
  mentorship: 'PBT Masterplan Programme',
};

/**
 * Fixed monthly defaults, VAT-exclusive. Annual is 10 months' worth (2
 * months free) -- the same convention this app has used since Premium
 * paths, now just admin-overridable on top of it. These are the values a
 * tier/cycle resets to when an admin clears a custom override.
 */
const DEFAULT_MONTHLY: Record<BillingTier, number> = {
  pathway: 99,
  plus: 249,
  mentorship: 449,
};

const TIERS: BillingTier[] = ['pathway', 'plus', 'mentorship'];
const CYCLES: BillingCycle[] = ['monthly', 'annual'];

export function defaultAmountFor(tier: BillingTier, billingCycle: BillingCycle): number {
  return billingCycle === 'monthly' ? DEFAULT_MONTHLY[tier] : DEFAULT_MONTHLY[tier] * 10;
}

export interface EffectivePrice {
  tier: BillingTier;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  stripePriceId: string;
  isDefault: boolean;
}

function toEffectivePrice(doc: TierPricingDocument): EffectivePrice {
  return {
    tier: doc.tier,
    billingCycle: doc.billingCycle,
    amount: doc.amount,
    currency: doc.currency,
    stripePriceId: doc.stripePriceId,
    isDefault: doc.isDefault,
  };
}

export class PricingService {
  /**
   * Creates the Stripe Product/Price + TierPricing row for a tier/cycle
   * that has never been priced before, at the hardcoded default amount.
   * Safe to call repeatedly -- a no-op once an active row already exists.
   */
  private async ensureSeeded(tier: BillingTier, billingCycle: BillingCycle): Promise<TierPricingDocument> {
    const existing = await TierPricing.findOne({ tier, billingCycle, isActive: true });
    if (existing) return existing;

    const product = await StripeService.findOrCreateProduct(tier, TIER_LABEL[tier]);
    const amount = defaultAmountFor(tier, billingCycle);
    const price = await StripeService.createPrice(product.id, tier, billingCycle, amount);

    const created = await TierPricing.create({
      tier,
      billingCycle,
      amount,
      currency: 'GBP',
      stripePriceId: price.id,
      isActive: true,
      isDefault: true,
    });
    logger.info('Seeded default TierPricing', { tier, billingCycle, amount });
    return created;
  }

  /** Ensures every tier x cycle combination has a priced row -- called once at startup and by the setup script. */
  async ensureAllSeeded(): Promise<void> {
    for (const tier of TIERS) {
      for (const billingCycle of CYCLES) {
        await this.ensureSeeded(tier, billingCycle);
      }
    }
  }

  async getEffectivePrice(tier: BillingTier, billingCycle: BillingCycle): Promise<EffectivePrice> {
    const doc = await this.ensureSeeded(tier, billingCycle);
    return toEffectivePrice(doc);
  }

  async getAllEffectivePrices(): Promise<EffectivePrice[]> {
    const prices: EffectivePrice[] = [];
    for (const tier of TIERS) {
      for (const billingCycle of CYCLES) {
        prices.push(await this.getEffectivePrice(tier, billingCycle));
      }
    }
    return prices;
  }

  /**
   * Admin override -- creates a brand new Stripe Price (the old one is
   * archived, never mutated, since Stripe Prices are immutable) and makes
   * it the active one for this tier/cycle. Every future checkout for this
   * tier/cycle uses the new price immediately; existing subscribers keep
   * whatever price they originally subscribed at until they renew/change
   * tier, which is standard SaaS pricing-change behavior.
   */
  async setPricing(tier: BillingTier, billingCycle: BillingCycle, amount: number, adminUserId: string): Promise<EffectivePrice> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError('Amount must be a positive number');
    }

    const current = await this.ensureSeeded(tier, billingCycle);
    const product = await StripeService.findOrCreateProduct(tier, TIER_LABEL[tier]);
    const price = await StripeService.createPrice(product.id, tier, billingCycle, amount);

    await StripeService.deactivatePrice(current.stripePriceId);
    current.isActive = false;
    await current.save();

    const created = await TierPricing.create({
      tier,
      billingCycle,
      amount,
      currency: 'GBP',
      stripePriceId: price.id,
      isActive: true,
      isDefault: amount === defaultAmountFor(tier, billingCycle),
      updatedBy: new Types.ObjectId(adminUserId),
    });
    logger.info('Admin pricing override applied', { tier, billingCycle, amount, adminUserId });
    return toEffectivePrice(created);
  }

  async resetToDefault(tier: BillingTier, billingCycle: BillingCycle, adminUserId: string): Promise<EffectivePrice> {
    return this.setPricing(tier, billingCycle, defaultAmountFor(tier, billingCycle), adminUserId);
  }

  /** Full history for a single tier/cycle, most recent first -- an audit trail of every pricing change ever made. */
  async getHistory(tier: BillingTier, billingCycle: BillingCycle) {
    const rows = await TierPricing.find({ tier, billingCycle })
      .sort({ createdAt: -1 })
      .populate('updatedBy', 'fullName email');
    if (rows.length === 0) throw new NotFoundError('No pricing history for this tier/cycle yet');
    return rows;
  }
}

export const pricingService = new PricingService();

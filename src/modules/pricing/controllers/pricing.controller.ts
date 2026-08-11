import { Request, Response } from 'express';
import { pricingService, TIER_LABEL } from '@/modules/pricing/services/pricing.service';
import { tierParamSchema, setPricingSchema } from '@/modules/pricing/validators/pricing.validators';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { AuthenticationError } from '@/core/errors/AppError';
import type { BillingTier } from '@/core/payments/StripeService';

function toFrontendTier(tier: BillingTier): 'Pathway' | 'Plus' | 'Mentorship' {
  return (tier.charAt(0).toUpperCase() + tier.slice(1)) as 'Pathway' | 'Plus' | 'Mentorship';
}

export class PricingController {
  /** Public -- powers pricing display on /join, /login, and My Subscription before/without auth. */
  async getPublicPricing(req: Request, res: Response): Promise<void> {
    const prices = await pricingService.getAllEffectivePrices();
    const formatted = prices.map((p) => ({
      tier: toFrontendTier(p.tier),
      tierLabel: TIER_LABEL[p.tier],
      billingCycle: p.billingCycle,
      amount: p.amount,
      currency: p.currency,
    }));
    ResponseHandler.ok(res, 'Pricing retrieved successfully', formatted);
  }

  async adminListPricing(req: Request, res: Response): Promise<void> {
    const prices = await pricingService.getAllEffectivePrices();
    const formatted = prices.map((p) => ({ ...p, tierLabel: TIER_LABEL[p.tier] }));
    ResponseHandler.ok(res, 'Pricing retrieved successfully', formatted);
  }

  async adminSetPricing(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthenticationError('User not authenticated');
    const { tier, billingCycle } = tierParamSchema.parse(req.params);
    const { amount } = setPricingSchema.parse(req.body);

    const result = await pricingService.setPricing(tier, billingCycle, amount, req.user.userId);
    ResponseHandler.ok(res, 'Pricing updated successfully', result);
  }

  async adminResetPricing(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthenticationError('User not authenticated');
    const { tier, billingCycle } = tierParamSchema.parse(req.params);

    const result = await pricingService.resetToDefault(tier, billingCycle, req.user.userId);
    ResponseHandler.ok(res, 'Pricing reset to default', result);
  }

  async adminGetHistory(req: Request, res: Response): Promise<void> {
    const { tier, billingCycle } = tierParamSchema.parse(req.params);
    const history = await pricingService.getHistory(tier, billingCycle);
    ResponseHandler.ok(res, 'Pricing history retrieved successfully', history);
  }
}

export const pricingController = new PricingController();

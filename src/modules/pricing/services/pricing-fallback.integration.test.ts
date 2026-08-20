import { connectTestDb, clearTestDb, disconnectTestDb } from '@/testing/db';
import { TierPricing } from '@/modules/pricing/schemas/TierPricing.schema';
import { pricingService } from '@/modules/pricing/services/pricing.service';
import { billingService } from '@/modules/billing/services/billing.service';
import { StripeService } from '@/core/payments/StripeService';

/**
 * Pricing has to be readable without Stripe.
 *
 * getEffectivePrice() used to call ensureSeeded() unconditionally, so on a
 * database with no priced rows and no reachable Stripe the public
 * GET /pricing endpoint 500'd -- and the frontend, left with no data,
 * rendered every tier as "£0 + VAT/month" on Join, Renew and My
 * Subscription. Quoting free membership is a worse failure than saying
 * nothing, so displaying a price and taking a payment are now separate
 * concerns: display falls back to the known default, checkout refuses.
 */
describe('pricing survives Stripe being unavailable', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    jest.spyOn(StripeService, 'isConfigured').mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('serves the default amount when no Stripe Price can be created', async () => {
    const price = await pricingService.getEffectivePrice('plus', 'monthly');

    expect(price.amount).toBe(249);
    expect(price.currency).toBe('GBP');
    // The empty price id is the signal that nothing in Stripe backs this yet.
    expect(price.stripePriceId).toBe('');
  });

  it('persists nothing in that state, so the next request retries the seed', async () => {
    await pricingService.getEffectivePrice('plus', 'monthly');
    await expect(TierPricing.countDocuments({})).resolves.toBe(0);
  });

  it('answers for every tier and cycle rather than failing the whole endpoint', async () => {
    const prices = await pricingService.getAllEffectivePrices();

    expect(prices).toHaveLength(6);
    expect(prices.every((p) => p.amount > 0)).toBe(true);
    // Annual is ten months' worth -- two months free.
    expect(prices.find((p) => p.tier === 'pathway' && p.billingCycle === 'annual')!.amount).toBe(990);
  });

  it('prefers a real stored price over the default', async () => {
    await TierPricing.create({
      tier: 'plus',
      billingCycle: 'monthly',
      amount: 199,
      currency: 'GBP',
      stripePriceId: 'price_real_123',
      isActive: true,
      isDefault: false,
    });

    const price = await pricingService.getEffectivePrice('plus', 'monthly');
    expect(price.amount).toBe(199);
    expect(price.stripePriceId).toBe('price_real_123');
  });

  it('refuses checkout for a tier that has no Stripe Price behind it', async () => {
    // Displaying £249 is fine; charging it needs a real Stripe Price, so
    // this fails loudly instead of handing Stripe an empty price id.
    await expect(
      billingService.createSignupCheckout({
        fullName: 'Nina New',
        email: 'nina@pbt.test',
        tier: 'Plus',
        billingCycle: 'monthly',
      })
    ).rejects.toThrow(/temporarily unavailable/i);
  });
});

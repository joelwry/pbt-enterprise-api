/**
 * One-time (but safe to re-run) setup script: creates the 3 Stripe Products
 * (Pathway/Plus/Mentorship) and 6 Prices (monthly + annual each) that the
 * billing module needs, matching the real pricing already shown to members
 * (subscription.service.ts#getPriceForTier -- £39/£79/£149 monthly, annual
 * = 10 months' worth). Prints the resulting Price ids to paste into .env.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/stripe-setup.ts
 *
 * Requires STRIPE_SECRET_KEY to already be set in .env (a free Stripe
 * account's Test mode secret key -- no card required to get one).
 * Re-running is safe: existing Products/Prices are found by metadata and
 * reused rather than duplicated (Stripe Prices are immutable once created,
 * so a changed amount would need a new Price, not an update).
 */
import Stripe from 'stripe';
import { config } from '@/config/environment';

const MONTHLY_PRICE: Record<string, number> = { pathway: 39, plus: 79, mentorship: 149 };
const TIER_LABEL: Record<string, string> = {
  pathway: 'PBT Pathway',
  plus: 'PBT Plus',
  mentorship: 'PBT Masterplan Programme',
};
const TIERS = ['pathway', 'plus', 'mentorship'] as const;
const CYCLES = ['monthly', 'annual'] as const;

async function findOrCreateProduct(stripe: Stripe, tier: string): Promise<Stripe.Product> {
  const existing = await stripe.products.search({ query: `metadata['tierKey']:'${tier}'` });
  if (existing.data[0]) {
    console.log(`  Product ${TIER_LABEL[tier]} already exists (${existing.data[0].id})`);
    return existing.data[0];
  }

  const product = await stripe.products.create({
    name: TIER_LABEL[tier],
    metadata: { tierKey: tier },
  });
  console.log(`  Created product ${TIER_LABEL[tier]} (${product.id})`);
  return product;
}

async function findOrCreatePrice(stripe: Stripe, product: Stripe.Product, tier: string, cycle: 'monthly' | 'annual'): Promise<Stripe.Price> {
  const amount = cycle === 'monthly' ? MONTHLY_PRICE[tier] : MONTHLY_PRICE[tier] * 10;
  const unitAmount = amount * 100; // Stripe amounts are in minor units (pence)

  const existingPrices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const existing = existingPrices.data.find((p) => p.metadata?.billingCycle === cycle);
  if (existing) {
    console.log(`    Price ${tier}/${cycle} already exists (${existing.id})`);
    return existing;
  }

  const price = await stripe.prices.create({
    product: product.id,
    currency: 'gbp',
    unit_amount: unitAmount,
    recurring: { interval: cycle === 'monthly' ? 'month' : 'year' },
    metadata: { tierKey: tier, billingCycle: cycle },
  });
  console.log(`    Created price ${tier}/${cycle}: £${amount} (${price.id})`);
  return price;
}

async function main() {
  if (!config.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set. Add your Stripe Test mode secret key to .env first.');
    process.exit(1);
  }

  const stripe = new Stripe(config.STRIPE_SECRET_KEY);
  const envLines: string[] = [];

  for (const tier of TIERS) {
    console.log(`\n${TIER_LABEL[tier]}:`);
    const product = await findOrCreateProduct(stripe, tier);

    for (const cycle of CYCLES) {
      const price = await findOrCreatePrice(stripe, product, tier, cycle);
      const envKey = `STRIPE_PRICE_${tier.toUpperCase()}_${cycle.toUpperCase()}`;
      envLines.push(`${envKey}=${price.id}`);
    }
  }

  console.log('\nAdd these to your backend .env:\n');
  console.log(envLines.join('\n'));
}

main().catch((error) => {
  console.error('Stripe setup failed:', error.message ?? error);
  process.exit(1);
});

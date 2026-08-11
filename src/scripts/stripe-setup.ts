/**
 * One-time (but safe to re-run) setup script: ensures every membership tier
 * x billing cycle combination has a real Stripe Product/Price and a
 * TierPricing row backing it, at the hardcoded default amounts (see
 * modules/pricing/services/pricing.service.ts -- currently £99/£249/£449
 * monthly, annual = 10 months' worth).
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/stripe-setup.ts
 *
 * Requires STRIPE_SECRET_KEY to already be set in .env (a free Stripe
 * account's Test mode secret key -- no card required to get one). This is
 * also called automatically at server startup when Stripe is configured
 * (see server.ts) -- running it manually is only needed for a fresh
 * environment before the server has ever started, or to confirm pricing is
 * seeded without booting the whole app.
 */
import { connectDB, disconnectDB } from '@/database/connection';
import { config } from '@/config/environment';
import { pricingService } from '@/modules/pricing/services/pricing.service';

async function main() {
  if (!config.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set. Add your Stripe Test mode secret key to .env first.');
    process.exit(1);
  }

  await connectDB();
  await pricingService.ensureAllSeeded();

  const prices = await pricingService.getAllEffectivePrices();
  console.log('\nActive pricing:\n');
  for (const p of prices) {
    console.log(`  ${p.tier}/${p.billingCycle}: £${p.amount} (${p.stripePriceId})${p.isDefault ? '' : ' [custom]'}`);
  }

  await disconnectDB();
}

main().catch(async (error) => {
  console.error('Stripe setup failed:', error.message ?? error);
  await disconnectDB();
  process.exit(1);
});

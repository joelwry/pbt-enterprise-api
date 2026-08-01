import Stripe from 'stripe';
import { config } from '@/config/environment';
import logger from '@/core/logger/logger';

export type BillingTier = 'pathway' | 'plus' | 'mentorship';
export type BillingCycle = 'monthly' | 'annual';

/**
 * Wraps the Stripe SDK the same way EmailService wraps nodemailer: lazily
 * instantiated, gated behind an isConfigured() check, so nothing that calls
 * in here needs its own "is Stripe set up" branching, and the rest of the
 * app never has to guard against a missing API key at every call site.
 */
export class StripeService {
  private static client: Stripe | null | undefined;

  static isConfigured(): boolean {
    return Boolean(config.STRIPE_SECRET_KEY);
  }

  private static getClient(): Stripe {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing)');
    }
    if (this.client == null) {
      this.client = new Stripe(config.STRIPE_SECRET_KEY);
    }
    return this.client;
  }

  /** Maps a membership tier + billing cycle to the real Stripe Price id created by src/scripts/stripe-setup.ts. */
  static priceIdFor(tier: BillingTier, billingCycle: BillingCycle): string {
    const table: Record<BillingTier, Record<BillingCycle, string>> = {
      pathway: { monthly: config.STRIPE_PRICE_PATHWAY_MONTHLY, annual: config.STRIPE_PRICE_PATHWAY_ANNUAL },
      plus: { monthly: config.STRIPE_PRICE_PLUS_MONTHLY, annual: config.STRIPE_PRICE_PLUS_ANNUAL },
      mentorship: { monthly: config.STRIPE_PRICE_MENTORSHIP_MONTHLY, annual: config.STRIPE_PRICE_MENTORSHIP_ANNUAL },
    };
    const priceId = table[tier][billingCycle];
    if (!priceId) {
      throw new Error(`No Stripe Price id configured for ${tier}/${billingCycle} -- run src/scripts/stripe-setup.ts`);
    }
    return priceId;
  }

  static async createCheckoutSession(options: {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
    customerId?: string;
    customerEmail?: string;
  }): Promise<Stripe.Checkout.Session> {
    const session = await this.getClient().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: options.priceId, quantity: 1 }],
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: options.metadata,
      subscription_data: { metadata: options.metadata },
      ...(options.customerId
        ? { customer: options.customerId }
        : options.customerEmail
          ? { customer_email: options.customerEmail }
          : {}),
    });

    logger.info('Stripe Checkout Session created', { sessionId: session.id, metadata: options.metadata });
    return session;
  }

  /**
   * Verifies the webhook signature -- throws if the payload was tampered
   * with or the secret doesn't match. `Stripe.webhooks` is a static helper
   * (pure HMAC verification, no network call), so this works even without a
   * configured STRIPE_SECRET_KEY -- only STRIPE_WEBHOOK_SECRET matters here.
   */
  static constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return Stripe.webhooks.constructEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET);
  }

  /** Test-only helper: signs a synthetic event the same way Stripe would, so webhook handling can be verified without a real Stripe account or a publicly reachable URL. */
  static generateTestWebhookHeader(payload: string): string {
    return Stripe.webhooks.generateTestHeaderString({ payload, secret: config.STRIPE_WEBHOOK_SECRET });
  }

  /** Creates a new Stripe Customer -- callers are responsible for checking user.stripeCustomerId first and reusing it if already set. */
  static async createCustomer(userId: string, email: string, name: string): Promise<Stripe.Customer> {
    return this.getClient().customers.create({
      email,
      name,
      metadata: { userId },
    });
  }
}

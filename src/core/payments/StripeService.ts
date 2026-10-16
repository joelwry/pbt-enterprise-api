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
      // Explicit fetch-based HTTP client (supported since Node 18) rather
      // than Stripe's default Node `https`-module client -- the fetch
      // client is what actually honors HTTPS_PROXY/NODE_USE_ENV_PROXY in
      // proxied environments; the legacy client silently tries a direct
      // connection instead.
      this.client = new Stripe(config.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });
    }
    return this.client;
  }

  /** Finds the Product for a tier by its metadata tag, creating it if this is the first time this tier has ever been priced. */
  static async findOrCreateProduct(tier: BillingTier, label: string): Promise<Stripe.Product> {
    const existing = await this.getClient().products.search({ query: `metadata['tierKey']:'${tier}'` });
    if (existing.data[0]) return existing.data[0];

    const product = await this.getClient().products.create({ name: label, metadata: { tierKey: tier } });
    logger.info('Stripe Product created', { tier, productId: product.id });
    return product;
  }

  /**
   * Stripe Prices are immutable once created -- there is no "edit the
   * amount" operation. Every pricing change (including an admin override)
   * creates a brand new Price object; the caller is responsible for
   * deactivating whatever Price it's superseding via deactivatePrice().
   */
  static async createPrice(productId: string, tier: BillingTier, billingCycle: BillingCycle, amountMajorUnits: number, currency = 'gbp'): Promise<Stripe.Price> {
    const price = await this.getClient().prices.create({
      product: productId,
      currency,
      unit_amount: Math.round(amountMajorUnits * 100),
      recurring: { interval: billingCycle === 'monthly' ? 'month' : 'year' },
      tax_behavior: 'exclusive',
      metadata: { tierKey: tier, billingCycle },
    });
    logger.info('Stripe Price created', { tier, billingCycle, amountMajorUnits, priceId: price.id });
    return price;
  }

  /** Archives a superseded Price so it can no longer be used for new Checkout Sessions -- existing subscriptions on it are unaffected. */
  static async deactivatePrice(priceId: string): Promise<void> {
    await this.getClient().prices.update(priceId, { active: false });
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
    // Default is Stripe's own 300s replay window. Dev-only escape hatch: set
    // STRIPE_WEBHOOK_TOLERANCE_SECONDS in .env to widen it while diagnosing
    // clock/forwarding problems -- never set it in production.
    const override = Number(process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS);
    const tolerance = Number.isFinite(override) && override > 0 ? override : 300;
    return Stripe.webhooks.constructEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET, tolerance);
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

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
   * Ends a live Stripe subscription so the member stops being charged.
   *
   * `atPeriodEnd: true` is the voluntary-cancellation case -- Stripe stops
   * the renewal but the member stays paid up until the current period
   * ends, which is exactly the business rule the member portal already
   * promises ("you'll keep access until {date}").
   *
   * `atPeriodEnd: false` ends it there and then, for the case where one
   * subscription supersedes another (a member checking out twice, or
   * changing tier): leaving the old Stripe subscription live would charge
   * them for both.
   *
   * Already-cancelled and no-longer-existing subscriptions are treated as
   * success rather than an error -- the caller's goal is "this must not
   * bill again", and both of those states already satisfy it. That makes
   * this safe to call from a webhook Stripe may redeliver.
   */
  static async cancelSubscription(stripeSubscriptionId: string, options: { atPeriodEnd: boolean }): Promise<void> {
    try {
      if (options.atPeriodEnd) {
        await this.getClient().subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });
      } else {
        await this.getClient().subscriptions.cancel(stripeSubscriptionId);
      }
      logger.info('Stripe subscription cancelled', { stripeSubscriptionId, atPeriodEnd: options.atPeriodEnd });
    } catch (error) {
      if (isAlreadyGone(error)) {
        logger.info('Stripe subscription already cancelled or gone, nothing to do', { stripeSubscriptionId });
        return;
      }
      throw error;
    }
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

/**
 * A Stripe error meaning "there is nothing here to cancel": either the
 * subscription id doesn't exist at all (`resource_missing`), or it exists
 * but has already been cancelled, which Stripe rejects as an invalid
 * request rather than a no-op.
 */
function isAlreadyGone(error: unknown): boolean {
  const err = error as { code?: string; message?: string; type?: string };
  if (err?.code === 'resource_missing') return true;
  return err?.type === 'StripeInvalidRequestError' && Boolean(err.message?.includes('canceled'));
}

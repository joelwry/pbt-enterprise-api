import crypto from 'crypto';
import type Stripe from 'stripe';
import { User } from '@/modules/users/schemas/User.schema';
import { Subscription, SubscriptionDocument } from '@/modules/subscriptions/schemas/Subscription.schema';
import { StripeService, BillingTier, BillingCycle } from '@/core/payments/StripeService';
import { pricingService } from '@/modules/pricing/services/pricing.service';
import { supersedeActiveSubscriptions } from '@/modules/subscriptions/services/subscription.service';
import { authRepository } from '@/modules/auth/repositories/auth.repository';
import { referralService } from '@/modules/referrals/services/referral.service';
import { EmailService } from '@/core/email/EmailService';
import { config } from '@/config/environment';
import { AppError, ConflictError, NotFoundError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

type FrontendTier = 'Pathway' | 'Plus' | 'Mentorship';

function toBackendTier(tier: FrontendTier): BillingTier {
  return tier.toLowerCase() as BillingTier;
}

/** Maps Stripe's own subscription lifecycle status onto our simpler local enum. */
function toLocalStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionDocument['status'] {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'pending';
    case 'canceled':
    case 'paused':
      return 'cancelled';
    case 'incomplete_expired':
      return 'expired';
    default:
      return 'pending';
  }
}

/**
 * A tier can have a displayable price with no Stripe Price behind it --
 * pricingService falls back to the default amount when it can't reach
 * Stripe, so the portal shows real numbers instead of "£0". Checkout is the
 * one operation that actually needs the Stripe Price, so it refuses here
 * with a clear message rather than handing Stripe an empty price id and
 * surfacing whatever error that produces.
 */
function assertPayable(stripePriceId: string, tier: BillingTier, billingCycle: BillingCycle): void {
  if (stripePriceId) return;
  logger.error('Checkout attempted for a tier with no Stripe Price', { tier, billingCycle });
  throw new AppError(503, 'Payments are temporarily unavailable -- please try again shortly.', ['ERR_6003']);
}

function periodEndOf(subscription: Stripe.Subscription): Date {
  // `current_period_end` lives on the subscription item, not the subscription
  // itself, as of this SDK's pinned API version.
  const seconds = subscription.items.data[0]?.current_period_end ?? Math.floor(Date.now() / 1000);
  return new Date(seconds * 1000);
}

export class BillingService {
  /**
   * A brand new visitor picking a tier and paying for the first time -- no
   * account exists until the webhook confirms payment. The frontend never
   * gets to "create" a member itself; only a real, verified Stripe payment
   * does.
   */
  async createSignupCheckout(input: {
    fullName: string;
    email: string;
    tier: FrontendTier;
    billingCycle: BillingCycle;
    referralCode?: string;
  }) {
    const email = input.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
      throw new ConflictError('An account with this email already exists -- try signing in instead.');
    }

    const backendTier = toBackendTier(input.tier);
    const { stripePriceId } = await pricingService.getEffectivePrice(backendTier, input.billingCycle);
    assertPayable(stripePriceId, backendTier, input.billingCycle);

    const session = await StripeService.createCheckoutSession({
      priceId: stripePriceId,
      customerEmail: email,
      successUrl: `${config.FRONTEND_URL}/join/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${config.FRONTEND_URL}/join?cancelled=true`,
      metadata: {
        intent: 'signup',
        fullName: input.fullName,
        email,
        tier: backendTier,
        billingCycle: input.billingCycle,
        referralCode: input.referralCode ?? '',
      },
    });

    if (!session.url) throw new AppError(500, 'Stripe did not return a Checkout URL', ['ERR_6001']);
    return { checkoutUrl: session.url };
  }

  /** An existing, logged-in member renewing their current tier or switching to a different one. */
  async createMemberCheckout(userId: string, input: { tier: FrontendTier; billingCycle: BillingCycle }) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('Member not found');

    const backendTier = toBackendTier(input.tier);
    const { stripePriceId } = await pricingService.getEffectivePrice(backendTier, input.billingCycle);
    assertPayable(stripePriceId, backendTier, input.billingCycle);

    if (!user.stripeCustomerId) {
      const customer = await StripeService.createCustomer(userId, user.email, user.fullName);
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    const session = await StripeService.createCheckoutSession({
      priceId: stripePriceId,
      customerId: user.stripeCustomerId,
      successUrl: `${config.FRONTEND_URL}/my-subscription?checkout=success`,
      cancelUrl: `${config.FRONTEND_URL}/my-subscription?checkout=cancelled`,
      metadata: {
        intent: 'renew',
        userId,
        tier: backendTier,
        billingCycle: input.billingCycle,
      },
    });

    if (!session.url) throw new AppError(500, 'Stripe did not return a Checkout URL', ['ERR_6001']);
    return { checkoutUrl: session.url };
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        logger.debug('Unhandled Stripe webhook event type', { type: event.type });
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const metadata = session.metadata ?? {};
    const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

    if (!stripeSubscriptionId || !stripeCustomerId) {
      logger.warn('checkout.session.completed missing subscription/customer id', { sessionId: session.id });
      return;
    }

    // Idempotency: Stripe can and does redeliver webhooks. If we've already
    // recorded this Stripe subscription locally, there's nothing left to do.
    const alreadyProcessed = await Subscription.findOne({ stripeSubscriptionId });
    if (alreadyProcessed) {
      logger.info('checkout.session.completed already processed, skipping', { stripeSubscriptionId });
      return;
    }

    const tier = metadata.tier as BillingTier;
    const billingCycle = metadata.billingCycle as BillingCycle;
    // session.amount_total is what was actually charged (in pence) -- more
    // authoritative than re-reading "current" pricing, which could have
    // changed between checkout-session creation and this webhook firing.
    const amount = session.amount_total != null
      ? session.amount_total / 100
      : (await pricingService.getEffectivePrice(tier, billingCycle)).amount;

    if (metadata.intent === 'signup') {
      let user = await User.findOne({ email: metadata.email });
      const isNewUser = !user;

      if (!user) {
        const temporaryPassword = crypto.randomBytes(16).toString('hex');
        user = await User.create({
          email: metadata.email,
          password: temporaryPassword,
          fullName: metadata.fullName,
          role: 'member',
          emailVerified: false,
        });
      }

      user.stripeCustomerId = stripeCustomerId;
      await user.save();

      // Two genuinely distinct completed checkout sessions for the same
      // person (e.g. they click Join twice, or resume an abandoned
      // checkout and then complete a fresh one) each carry their own
      // stripeSubscriptionId, so the alreadyProcessed check above never
      // catches this -- without it, the member ends up with two active
      // subscriptions and is billed twice. Same rule the 'renew' branch
      // below already applies.
      //
      // Marking the old record cancelled locally was never enough on its
      // own: the superseded *Stripe* subscription carried on charging the
      // card every month while the admin UI showed a single active
      // subscription. supersedeActiveSubscriptions() cancels it in Stripe
      // too.
      await supersedeActiveSubscriptions(user._id, { exceptStripeSubscriptionId: stripeSubscriptionId });

      const newSubscription = await Subscription.create({
        userId: user._id,
        tier,
        status: 'active',
        startDate: new Date(),
        endDate: periodEndOfCheckout(session),
        billingCycle,
        amount,
        currency: 'GBP',
        transactionId: session.id,
        stripeSubscriptionId,
      });

      // This is the referred member's qualifying first payment -- the only
      // moment a referral reward is ever calculated. `amount` here is what
      // Stripe actually charged (see above), never a tier's list price.
      await referralService.recordReferralWithFirstPayment(metadata.referralCode || undefined, user._id.toString(), {
        tier,
        billingCycle,
        amount,
        paidAt: newSubscription.startDate,
        subscriptionId: newSubscription._id,
      });

      if (isNewUser) {
        const setupToken = await authRepository.setPasswordResetToken(user._id.toString());
        // Not awaited -- Stripe expects a fast webhook response and retries
        // on timeout; the subscription is already durably recorded above,
        // so a slow/unreachable SMTP server shouldn't hold up the ack.
        EmailService.sendAccountSetupEmail(user.email, user.fullName, setupToken).catch(() => {});
      }

      logger.info('New member created from Stripe Checkout', { userId: user._id.toString(), tier });
      return;
    }

    if (metadata.intent === 'renew') {
      const user = await User.findById(metadata.userId);
      if (!user) {
        logger.error('checkout.session.completed: userId in metadata not found', { userId: metadata.userId });
        return;
      }

      if (!user.stripeCustomerId) {
        user.stripeCustomerId = stripeCustomerId;
        await user.save();
      }

      // Superseding whatever active subscription this member already has,
      // same rule createSubscription() already applies for every other
      // path -- including cancelling it in Stripe, so a member who renews
      // or changes tier isn't left paying for both.
      await supersedeActiveSubscriptions(user._id, { exceptStripeSubscriptionId: stripeSubscriptionId });

      await Subscription.create({
        userId: user._id,
        tier,
        status: 'active',
        startDate: new Date(),
        endDate: periodEndOfCheckout(session),
        billingCycle,
        amount,
        currency: 'GBP',
        transactionId: session.id,
        stripeSubscriptionId,
      });

      // Not awaited -- same reasoning as the signup branch above.
      EmailService.sendSubscriptionConfirmation(user.email, user.fullName, tier, amount * 100, billingCycle).catch(() => {});
      logger.info('Member subscription renewed/changed via Stripe Checkout', { userId: user._id.toString(), tier });
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const local = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
    if (!local) {
      logger.warn('customer.subscription.updated for unknown local subscription', { stripeSubscriptionId: subscription.id });
      return;
    }

    local.status = toLocalStatus(subscription.status);
    local.autoRenew = !subscription.cancel_at_period_end;
    local.endDate = periodEndOf(subscription);
    // A cancellation can originate in Stripe rather than here (the Stripe
    // dashboard, a failed-payment rule, or our own cancelSubscription()
    // whose webhook then echoes back). The member portal's "cancelled"
    // badge is computed from cancelledAt alone, so stamp it here too or a
    // Stripe-side cancellation shows up as a still-renewing subscription.
    if (subscription.cancel_at_period_end && !local.cancelledAt) {
      local.cancelledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : new Date();
    }
    await local.save();
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const local = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
    if (!local) return;

    local.status = 'expired';
    await local.save();
  }
}

/** A just-completed Checkout Session doesn't expand subscription.items itself -- the period end comes from the session's own `expires_at`-adjacent subscription object only once expanded, so for the *first* period we fall back to billingCycle math instead of a second Stripe round trip. */
function periodEndOfCheckout(session: Stripe.Checkout.Session): Date {
  const billingCycle = session.metadata?.billingCycle;
  const endDate = new Date();
  if (billingCycle === 'annual') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }
  return endDate;
}

export const billingService = new BillingService();

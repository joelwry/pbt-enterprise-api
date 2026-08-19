import type Stripe from 'stripe';
import { connectTestDb, clearTestDb, disconnectTestDb } from '@/testing/db';
import { User } from '@/modules/users/schemas/User.schema';
import { Subscription } from '@/modules/subscriptions/schemas/Subscription.schema';
import { subscriptionService } from '@/modules/subscriptions/services/subscription.service';
import { billingService } from '@/modules/billing/services/billing.service';
import { StripeService } from '@/core/payments/StripeService';

/**
 * Integration tests for subscription cancellation, run against a real local
 * MongoDB (`pbtDb_test`, see src/testing/db.ts) with only the Stripe network
 * boundary stubbed.
 *
 * These exist because of a real, live defect: nothing in this codebase ever
 * cancelled anything in Stripe. `cancelSubscription()` flipped local flags
 * and reported success while the member's card kept being charged every
 * month, and a member who checked out twice was billed for both
 * subscriptions while the admin UI showed one. The assertions below are
 * about the *Stripe call*, not just the Mongo write -- a version of this
 * code that only updates the database has to fail these tests.
 */

function checkoutCompletedEvent(overrides: {
  sessionId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  metadata: Record<string, string>;
}): Stripe.Event {
  return {
    id: `evt_${overrides.sessionId}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: overrides.sessionId,
        subscription: overrides.stripeSubscriptionId,
        customer: overrides.stripeCustomerId,
        amount_total: 24900,
        metadata: overrides.metadata,
      } as unknown as Stripe.Checkout.Session,
    },
  } as unknown as Stripe.Event;
}

async function createMemberWithSubscription(options: { email: string; stripeSubscriptionId?: string }) {
  const user = await User.create({
    email: options.email,
    password: 'TestPass123!',
    fullName: 'Test Member',
    role: 'member',
  });

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  const subscription = await Subscription.create({
    userId: user._id,
    tier: 'plus',
    status: 'active',
    startDate: new Date(),
    endDate,
    billingCycle: 'monthly',
    amount: 249,
    currency: 'GBP',
    ...(options.stripeSubscriptionId ? { stripeSubscriptionId: options.stripeSubscriptionId } : {}),
  });

  return { user, subscription };
}

describe('subscription cancellation stops billing in Stripe', () => {
  let cancelSpy: jest.SpyInstance;

  beforeAll(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    // Stripe's own SDK is the one thing not exercised for real here -- these
    // tests assert that we *call* it correctly, which is precisely the step
    // that was missing.
    jest.spyOn(StripeService, 'isConfigured').mockReturnValue(true);
    cancelSpy = jest.spyOn(StripeService, 'cancelSubscription').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('cancels the Stripe subscription at period end, and leaves local access intact until endDate', async () => {
    const { user, subscription } = await createMemberWithSubscription({
      email: 'cancels@pbt.test',
      stripeSubscriptionId: 'sub_live_123',
    });

    await subscriptionService.cancelSubscription(user._id.toString());

    expect(cancelSpy).toHaveBeenCalledWith('sub_live_123', { atPeriodEnd: true });

    const stored = await Subscription.findById(subscription._id);
    // Cancellation takes effect at the end of the paid period -- the member
    // keeps full access, so status stays 'active' and every tier gate built
    // on getCurrentSubscription() keeps working until endDate passes.
    expect(stored!.status).toBe('active');
    expect(stored!.autoRenew).toBe(false);
    expect(stored!.cancelledAt).toBeTruthy();
  });

  it('does not report a cancellation when Stripe refuses it', async () => {
    cancelSpy.mockRejectedValue(new Error('Stripe is down'));
    const { user, subscription } = await createMemberWithSubscription({
      email: 'stripe-fails@pbt.test',
      stripeSubscriptionId: 'sub_live_456',
    });

    await expect(subscriptionService.cancelSubscription(user._id.toString())).rejects.toThrow();

    // The member must not be shown a cancelled subscription that is still
    // being charged -- the local record stays untouched so a retry is honest.
    const stored = await Subscription.findById(subscription._id);
    expect(stored!.cancelledAt).toBeFalsy();
    expect(stored!.autoRenew).toBe(true);
  });

  it('refuses to cancel a Stripe-backed subscription when billing is not configured', async () => {
    (StripeService.isConfigured as jest.Mock).mockReturnValue(false);
    const { user } = await createMemberWithSubscription({
      email: 'no-stripe-key@pbt.test',
      stripeSubscriptionId: 'sub_live_789',
    });

    await expect(subscriptionService.cancelSubscription(user._id.toString())).rejects.toThrow();
    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it('still cancels a pre-Stripe subscription locally, without calling Stripe', async () => {
    const { user, subscription } = await createMemberWithSubscription({ email: 'legacy@pbt.test' });

    await subscriptionService.cancelSubscription(user._id.toString());

    expect(cancelSpy).not.toHaveBeenCalled();
    const stored = await Subscription.findById(subscription._id);
    expect(stored!.cancelledAt).toBeTruthy();
    expect(stored!.autoRenew).toBe(false);
  });
});

describe('a superseded subscription stops billing immediately', () => {
  let cancelSpy: jest.SpyInstance;

  beforeAll(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    jest.spyOn(StripeService, 'isConfigured').mockReturnValue(true);
    cancelSpy = jest.spyOn(StripeService, 'cancelSubscription').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('cancels the previous Stripe subscription when a member checks out again', async () => {
    const { user } = await createMemberWithSubscription({
      email: 'double-checkout@pbt.test',
      stripeSubscriptionId: 'sub_first',
    });

    await billingService.handleWebhookEvent(
      checkoutCompletedEvent({
        sessionId: 'cs_second',
        stripeSubscriptionId: 'sub_second',
        stripeCustomerId: 'cus_1',
        metadata: { intent: 'renew', userId: user._id.toString(), tier: 'plus', billingCycle: 'monthly' },
      })
    );

    // Immediately, not at period end: the member is already paying for the
    // replacement, so leaving the old one running charges them twice.
    expect(cancelSpy).toHaveBeenCalledWith('sub_first', { atPeriodEnd: false });
    // ...and never the subscription that just replaced it.
    expect(cancelSpy).not.toHaveBeenCalledWith('sub_second', expect.anything());

    const active = await Subscription.find({ userId: user._id, status: 'active' });
    expect(active).toHaveLength(1);
    expect(active[0].stripeSubscriptionId).toBe('sub_second');
  });

  it('records the new subscription even if cancelling the old one in Stripe fails', async () => {
    cancelSpy.mockRejectedValue(new Error('Stripe is down'));
    const { user } = await createMemberWithSubscription({
      email: 'supersede-fails@pbt.test',
      stripeSubscriptionId: 'sub_old',
    });

    // Stripe retries a webhook we fail to acknowledge, so losing a payment
    // we have already taken would be worse than one subscription needing
    // manual attention -- the failure is logged, not thrown.
    await expect(
      billingService.handleWebhookEvent(
        checkoutCompletedEvent({
          sessionId: 'cs_new',
          stripeSubscriptionId: 'sub_new',
          stripeCustomerId: 'cus_2',
          metadata: { intent: 'renew', userId: user._id.toString(), tier: 'plus', billingCycle: 'monthly' },
        })
      )
    ).resolves.toBeUndefined();

    const active = await Subscription.find({ userId: user._id, status: 'active' });
    expect(active).toHaveLength(1);
    expect(active[0].stripeSubscriptionId).toBe('sub_new');
  });
});

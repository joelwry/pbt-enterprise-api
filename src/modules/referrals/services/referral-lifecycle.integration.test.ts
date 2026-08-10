import type Stripe from 'stripe';
import { connectTestDb, clearTestDb, disconnectTestDb } from '@/testing/db';
import { User } from '@/modules/users/schemas/User.schema';
import { Subscription } from '@/modules/subscriptions/schemas/Subscription.schema';
import { Referral } from '@/modules/referrals/schemas/Referral.schema';
import { referralService } from '@/modules/referrals/services/referral.service';
import { billingService } from '@/modules/billing/services/billing.service';

/**
 * Integration tests for the referral lifecycle, run against a real local
 * MongoDB (an isolated `pbtDb_test` database -- see src/testing/db.ts), not
 * mocks. This exercises the actual webhook handler
 * (`billingService.handleWebhookEvent`), the same code path a real Stripe
 * webhook hits in production, so these tests cover Part 9 items 4-7 and 11
 * from the client's spec.
 */

function fakeCheckoutSessionCompleted(overrides: {
  sessionId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  amountTotalPence: number;
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
        amount_total: overrides.amountTotalPence,
        metadata: overrides.metadata,
      } as unknown as Stripe.Checkout.Session,
    },
  } as unknown as Stripe.Event;
}

async function createReferrer(email: string) {
  return User.create({ email, password: 'Passw0rd!', fullName: 'Referrer Member', role: 'member' });
}

describe('Referral lifecycle (integration, real test DB)', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('records the referral already qualified (REWARD_EARNED) from a real signup webhook, reward derived from the actual amount charged', async () => {
    const referrer = await createReferrer('referrer1@test.pbt');

    const event = fakeCheckoutSessionCompleted({
      sessionId: 'cs_test_1',
      stripeSubscriptionId: 'sub_test_1',
      stripeCustomerId: 'cus_test_1',
      amountTotalPence: 9900, // £99 -- Pathway
      metadata: {
        intent: 'signup',
        fullName: 'New Member',
        email: 'referred1@test.pbt',
        tier: 'pathway',
        billingCycle: 'monthly',
        referralCode: referrer._id.toString(),
      },
    });

    await billingService.handleWebhookEvent(event);

    const referred = await User.findOne({ email: 'referred1@test.pbt' });
    expect(referred).not.toBeNull();

    const referral = await Referral.findOne({ referredUserId: referred!._id });
    expect(referral).not.toBeNull();
    expect(referral!.status).toBe('REWARD_EARNED');
    expect(referral!.firstPaymentAmount).toBe(99);
    expect(referral!.rewardAmount).toBe(9.9);
    expect(referral!.rewardPercentage).toBe(10);
  });

  it('Part 9 #6 -- a duplicate/redelivered webhook for the same Stripe subscription does not create a second Subscription or a second Referral reward', async () => {
    const referrer = await createReferrer('referrer2@test.pbt');

    const event = fakeCheckoutSessionCompleted({
      sessionId: 'cs_test_2',
      stripeSubscriptionId: 'sub_test_2',
      stripeCustomerId: 'cus_test_2',
      amountTotalPence: 24900, // £249 -- Plus
      metadata: {
        intent: 'signup',
        fullName: 'Duplicate Webhook Member',
        email: 'referred2@test.pbt',
        tier: 'plus',
        billingCycle: 'monthly',
        referralCode: referrer._id.toString(),
      },
    });

    // Stripe redelivering the exact same event -- fires the handler twice.
    await billingService.handleWebhookEvent(event);
    await billingService.handleWebhookEvent(event);

    const referred = await User.findOne({ email: 'referred2@test.pbt' });
    const subscriptions = await Subscription.find({ userId: referred!._id });
    const referrals = await Referral.find({ referredUserId: referred!._id });

    expect(subscriptions).toHaveLength(1);
    expect(referrals).toHaveLength(1);
    expect(referrals[0].rewardAmount).toBe(24.9);
  });

  it('Part 9 #4/#5 -- a renewal for an existing referred member does not generate a second reward, however many times it happens', async () => {
    const referrer = await createReferrer('referrer3@test.pbt');

    const signupEvent = fakeCheckoutSessionCompleted({
      sessionId: 'cs_test_3',
      stripeSubscriptionId: 'sub_test_3',
      stripeCustomerId: 'cus_test_3',
      amountTotalPence: 44900, // £449 -- Mentorship
      metadata: {
        intent: 'signup',
        fullName: 'Renewing Member',
        email: 'referred3@test.pbt',
        tier: 'mentorship',
        billingCycle: 'monthly',
        referralCode: referrer._id.toString(),
      },
    });
    await billingService.handleWebhookEvent(signupEvent);

    const referred = await User.findOne({ email: 'referred3@test.pbt' });

    // Three separate "monthly renewal" webhooks for the same member -- intent
    // is 'renew', which never touches the Referral collection at all (see
    // billing.service.ts / referral.service.ts docstrings).
    for (let i = 0; i < 3; i++) {
      const renewEvent = fakeCheckoutSessionCompleted({
        sessionId: `cs_test_3_renew_${i}`,
        stripeSubscriptionId: `sub_test_3_renew_${i}`,
        stripeCustomerId: 'cus_test_3',
        amountTotalPence: 44900,
        metadata: {
          intent: 'renew',
          userId: referred!._id.toString(),
          tier: 'mentorship',
          billingCycle: 'monthly',
        },
      });
      await billingService.handleWebhookEvent(renewEvent);
    }

    const referrals = await Referral.find({ referredUserId: referred!._id });
    expect(referrals).toHaveLength(1);
    expect(referrals[0].rewardAmount).toBe(44.9);

    const subscriptions = await Subscription.find({ userId: referred!._id });
    expect(subscriptions.length).toBeGreaterThan(1); // renewals do create new Subscription rows...
    // ...but only ever exactly one Referral, from the original signup.
  });

  it('Part 9 #7 -- a referral recorded with no qualifying payment yet (legacy no-payment signup path) stays pending, not earning a reward', async () => {
    const referrer = await createReferrer('referrer4@test.pbt');
    const referred = await User.create({ email: 'referred4@test.pbt', password: 'Passw0rd!', fullName: 'No Payment Yet', role: 'member' });

    await referralService.recordReferral(referrer._id.toString(), referred._id.toString());

    const referral = await Referral.findOne({ referredUserId: referred._id });
    expect(referral).not.toBeNull();
    expect(referral!.status).toBe('CUSTOMER_SIGNED_UP');
    expect(referral!.rewardAmount).toBeUndefined();
    expect(referral!.firstPaymentAmount).toBeUndefined();
  });

  it('Part 9 #11 -- a member only ever sees their own referrals, never another referrer\'s', async () => {
    const referrerA = await createReferrer('referrerA@test.pbt');
    const referrerB = await createReferrer('referrerB@test.pbt');

    const referredForA = await User.create({ email: 'referredForA@test.pbt', password: 'Passw0rd!', fullName: 'A Referred', role: 'member' });
    const referredForB = await User.create({ email: 'referredForB@test.pbt', password: 'Passw0rd!', fullName: 'B Referred', role: 'member' });

    await referralService.recordReferral(referrerA._id.toString(), referredForA._id.toString());
    await referralService.recordReferral(referrerB._id.toString(), referredForB._id.toString());

    const { items: itemsForA } = await referralService.getReferredMembers(referrerA._id.toString(), 1, 10);
    const { items: itemsForB } = await referralService.getReferredMembers(referrerB._id.toString(), 1, 10);

    expect(itemsForA).toHaveLength(1);
    expect(itemsForA[0].memberName).toBe('A Referred');
    expect(itemsForB).toHaveLength(1);
    expect(itemsForB[0].memberName).toBe('B Referred');
  });
});

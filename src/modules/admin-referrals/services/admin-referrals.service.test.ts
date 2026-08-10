import { connectTestDb, clearTestDb, disconnectTestDb } from '@/testing/db';
import { User } from '@/modules/users/schemas/User.schema';
import { Referral } from '@/modules/referrals/schemas/Referral.schema';
import { adminReferralsService } from './admin-referrals.service';

describe('adminReferralsService.markPaid (integration, real test DB)', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  async function createEarnedReferral() {
    const referrer = await User.create({ email: 'referrer@test.pbt', password: 'Passw0rd!', fullName: 'Referrer', role: 'member' });
    const referred = await User.create({ email: 'referred@test.pbt', password: 'Passw0rd!', fullName: 'Referred Member', role: 'member' });
    const admin = await User.create({ email: 'admin@test.pbt', password: 'Passw0rd!', fullName: 'Ops Admin', role: 'admin' });

    const referral = await Referral.create({
      referrerId: referrer._id,
      referredUserId: referred._id,
      status: 'REWARD_EARNED',
      referredTier: 'pathway',
      referredBillingCycle: 'monthly',
      firstPaymentAmount: 99,
      firstPaymentDate: new Date(),
      rewardPercentage: 10,
      rewardAmount: 9.9,
      qualifiedAt: new Date(),
    });

    return { referral, admin };
  }

  it('Part 9 #8 -- an admin can mark an earned reward as paid', async () => {
    const { referral, admin } = await createEarnedReferral();

    const updated = await adminReferralsService.markPaid(referral._id.toString(), admin._id.toString(), {
      paymentReference: 'BANK-TX-123',
      adminNote: 'Paid via bank transfer',
    });

    expect(updated.status).toBe('PAID');
    expect(updated.paidAt).toBeInstanceOf(Date);
    expect(updated.paidBy?.toString()).toBe(admin._id.toString());
    expect(updated.paymentReference).toBe('BANK-TX-123');
    expect(updated.rewardAmount).toBe(9.9); // unchanged by the paid action -- reward was already fixed at qualification
  });

  it('Part 9 #10 -- a referral that has already been paid cannot be paid again', async () => {
    const { referral, admin } = await createEarnedReferral();

    await adminReferralsService.markPaid(referral._id.toString(), admin._id.toString(), {});

    await expect(adminReferralsService.markPaid(referral._id.toString(), admin._id.toString(), {})).rejects.toThrow(
      /already been marked as paid/i
    );
  });

  it('cannot mark a referral as paid before it has qualified (no reward earned yet)', async () => {
    const referrer = await User.create({ email: 'referrer2@test.pbt', password: 'Passw0rd!', fullName: 'Referrer Two', role: 'member' });
    const referred = await User.create({ email: 'referred2@test.pbt', password: 'Passw0rd!', fullName: 'Referred Two', role: 'member' });
    const admin = await User.create({ email: 'admin2@test.pbt', password: 'Passw0rd!', fullName: 'Ops Admin Two', role: 'admin' });

    const pendingReferral = await Referral.create({
      referrerId: referrer._id,
      referredUserId: referred._id,
      status: 'CUSTOMER_SIGNED_UP',
      rewardPercentage: 10,
    });

    await expect(adminReferralsService.markPaid(pendingReferral._id.toString(), admin._id.toString(), {})).rejects.toThrow(
      /not yet an earned reward/i
    );
  });
});

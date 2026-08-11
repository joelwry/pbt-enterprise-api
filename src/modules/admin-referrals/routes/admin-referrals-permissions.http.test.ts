import request from 'supertest';
import { createApp } from '@/app';
import { connectTestDb, clearTestDb, disconnectTestDb } from '@/testing/db';
import { User } from '@/modules/users/schemas/User.schema';
import { Referral } from '@/modules/referrals/schemas/Referral.schema';
import { JwtHelper } from '@/core/auth/JwtHelper';

/**
 * HTTP-level test: role enforcement for marking a referral reward as paid
 * happens in route middleware (`authorize('admin', 'super_admin')`), not in
 * the service layer, so it has to be exercised through the real Express app
 * -- a service-level test can't see this rule at all.
 */
describe('Referral payout route permissions (integration, real app + real test DB)', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectTestDb();
  });

  afterEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  async function seedEarnedReferral() {
    const referrer = await User.create({ email: 'referrer@test.pbt', password: 'Passw0rd!', fullName: 'Referrer', role: 'member' });
    const referred = await User.create({ email: 'referred@test.pbt', password: 'Passw0rd!', fullName: 'Referred', role: 'member' });
    const referral = await Referral.create({
      referrerId: referrer._id,
      referredUserId: referred._id,
      status: 'REWARD_EARNED',
      referredTier: 'pathway',
      firstPaymentAmount: 99,
      firstPaymentDate: new Date(),
      rewardPercentage: 10,
      rewardAmount: 9.9,
      qualifiedAt: new Date(),
    });
    return { referrer, referral };
  }

  it('Part 9 #9 -- a normal member gets 403 trying to mark a referral reward as paid', async () => {
    const { referrer, referral } = await seedEarnedReferral();
    const memberToken = JwtHelper.generateAccessToken({ userId: referrer._id.toString(), email: referrer.email, role: 'member' });

    const res = await request(app)
      .patch(`/api/v1/admin/referrals/${referral._id.toString()}/mark-paid`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({});

    expect(res.status).toBe(403);

    const unchanged = await Referral.findById(referral._id);
    expect(unchanged!.status).toBe('REWARD_EARNED');
  });

  it('an admin gets 200 marking the same referral as paid', async () => {
    const { referral } = await seedEarnedReferral();
    const admin = await User.create({ email: 'admin@test.pbt', password: 'Passw0rd!', fullName: 'Ops Admin', role: 'admin' });
    const adminToken = JwtHelper.generateAccessToken({ userId: admin._id.toString(), email: admin.email, role: 'admin' });

    const res = await request(app)
      .patch(`/api/v1/admin/referrals/${referral._id.toString()}/mark-paid`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentReference: 'REF-1' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PAID');
  });

  it('an unauthenticated request gets 401', async () => {
    const { referral } = await seedEarnedReferral();

    const res = await request(app).patch(`/api/v1/admin/referrals/${referral._id.toString()}/mark-paid`).send({});

    expect(res.status).toBe(401);
  });
});

import request from 'supertest';
import { createApp } from '@/app';
import { connectTestDb, clearTestDb, disconnectTestDb } from '@/testing/db';
import { User } from '@/modules/users/schemas/User.schema';
import { Referral } from '@/modules/referrals/schemas/Referral.schema';
import { JwtHelper } from '@/core/auth/JwtHelper';

/**
 * HTTP-level test: access control for marking a referral reward as paid
 * happens entirely in route middleware -- `authorize('admin',
 * 'super_admin')` for the role, then `requireSection('referrals')` for the
 * per-section grant -- not in the service layer, so it has to be exercised
 * through the real Express app; a service-level test can't see either rule.
 *
 * The 200 case here used to seed a plain admin with no adminSections and
 * expect success, which was correct until requireSection was introduced to
 * close the "section checkboxes were UI-only" gap. It has been red ever
 * since, asserting behaviour the platform deliberately no longer has.
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

  async function seedAdmin(options: { email: string; role: 'admin' | 'super_admin'; adminSections?: string[] }) {
    const admin = await User.create({
      email: options.email,
      password: 'Passw0rd!',
      fullName: 'Ops Admin',
      role: options.role,
      ...(options.adminSections ? { adminSections: options.adminSections } : {}),
    });
    return JwtHelper.generateAccessToken({ userId: admin._id.toString(), email: admin.email, role: options.role });
  }

  it('an admin granted the referrals section gets 200 marking the same referral as paid', async () => {
    const { referral } = await seedEarnedReferral();
    const adminToken = await seedAdmin({ email: 'admin@test.pbt', role: 'admin', adminSections: ['referrals'] });

    const res = await request(app)
      .patch(`/api/v1/admin/referrals/${referral._id.toString()}/mark-paid`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentReference: 'REF-1' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PAID');
  });

  it('an admin without the referrals section gets 403, even though their role is admin', async () => {
    // The section layer sits on top of the role check: role decides whether
    // you can reach admin endpoints at all, adminSections decides which
    // ones. This case is the whole reason requireSection exists -- before
    // it, a staff account granted only "Members" could call every other
    // admin module's API directly, because the section checkboxes were
    // enforced in the admin nav and nowhere else.
    const { referral } = await seedEarnedReferral();
    const adminToken = await seedAdmin({ email: 'members-only@test.pbt', role: 'admin', adminSections: ['members'] });

    const res = await request(app)
      .patch(`/api/v1/admin/referrals/${referral._id.toString()}/mark-paid`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentReference: 'REF-1' });

    expect(res.status).toBe(403);

    const unchanged = await Referral.findById(referral._id);
    expect(unchanged!.status).toBe('REWARD_EARNED');
  });

  it('a super_admin gets 200 with no sections granted at all', async () => {
    // Documented rule (DOMAIN_BIBLE.md #2): super_admin bypasses section
    // checks entirely, which is why granting sections is never part of
    // creating one.
    const { referral } = await seedEarnedReferral();
    const superToken = await seedAdmin({ email: 'super@test.pbt', role: 'super_admin' });

    const res = await request(app)
      .patch(`/api/v1/admin/referrals/${referral._id.toString()}/mark-paid`)
      .set('Authorization', `Bearer ${superToken}`)
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

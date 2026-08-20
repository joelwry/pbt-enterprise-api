import request from 'supertest';
import { createApp } from '@/app';
import { connectTestDb, clearTestDb, disconnectTestDb } from '@/testing/db';
import { User } from '@/modules/users/schemas/User.schema';
import { JwtHelper } from '@/core/auth/JwtHelper';

/**
 * Changing a tier's price is the most financially consequential thing an
 * admin can do -- it mints a new Stripe Price and archives the old one, and
 * every subsequent checkout charges the new amount. The controls live on
 * the Subscriptions & Billing page, so the API has to hold the same
 * 'subscriptions' section grant the nav item does.
 *
 * It didn't: this was the one admin module the section layer missed, so an
 * admin without that section simply couldn't *see* the editor. These tests
 * exist so it can't quietly drift back to role-only checking.
 */
describe('Admin pricing route permissions (integration, real app + real test DB)', () => {
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

  async function tokenFor(options: { email: string; role: 'member' | 'admin' | 'super_admin'; adminSections?: string[] }) {
    const user = await User.create({
      email: options.email,
      password: 'Passw0rd!',
      fullName: 'Staff Member',
      role: options.role,
      ...(options.adminSections ? { adminSections: options.adminSections } : {}),
    });
    return JwtHelper.generateAccessToken({ userId: user._id.toString(), email: user.email, role: options.role });
  }

  it('refuses an admin who does not hold the subscriptions section', async () => {
    const token = await tokenFor({ email: 'content-only@test.pbt', role: 'admin', adminSections: ['content'] });

    const res = await request(app)
      .put('/api/v1/admin/pricing/plus/monthly')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1 });

    expect(res.status).toBe(403);
  });

  it('refuses that same admin the read endpoints too', async () => {
    const token = await tokenFor({ email: 'content-only-read@test.pbt', role: 'admin', adminSections: ['content'] });

    const res = await request(app).get('/api/v1/admin/pricing').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('lets an admin holding the subscriptions section through the role/section gates', async () => {
    const token = await tokenFor({ email: 'billing@test.pbt', role: 'admin', adminSections: ['subscriptions'] });

    const res = await request(app).get('/api/v1/admin/pricing').set('Authorization', `Bearer ${token}`);

    // Past both gates -- what the endpoint then does with Stripe is
    // pricing's business, not this test's; it must simply not be 403.
    expect(res.status).not.toBe(403);
  });

  it('refuses a plain member outright', async () => {
    const token = await tokenFor({ email: 'member@test.pbt', role: 'member' });

    const res = await request(app).get('/api/v1/admin/pricing').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

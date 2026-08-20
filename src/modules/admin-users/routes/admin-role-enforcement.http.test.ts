import request from 'supertest';
import { createApp } from '@/app';
import { connectTestDb, clearTestDb, disconnectTestDb } from '@/testing/db';
import { User } from '@/modules/users/schemas/User.schema';
import { JwtHelper } from '@/core/auth/JwtHelper';
import { AdminRole, AdminSection, toBackendRole } from '@/core/auth/adminAccess';

/**
 * The security boundary, exercised the way an attacker would: straight at
 * the API, with no browser involved.
 *
 * Hiding a nav item is a courtesy to the person using the portal, not a
 * control. A Content Manager who knows the URL of the subscriptions
 * endpoint must still be refused by the server -- and every case below
 * calls the real Express app through its real middleware chain, so that is
 * what is being asserted.
 */
describe('admin role enforcement at the API (integration, real app + real test DB)', () => {
  const app = createApp();

  /** One representative GET per section-gated module. */
  const ENDPOINTS: Record<AdminSection, string> = {
    content: '/api/v1/admin/learning/roadmaps',
    resources: '/api/v1/admin/resources/stats',
    events: '/api/v1/admin/events/stats',
    community: '/api/v1/admin/community/stats',
    members: '/api/v1/admin/members/stats',
    pbtLeaders: '/api/v1/admin/leaders/stats',
    powerTeam: '/api/v1/admin/power-team/stats',
    subscriptions: '/api/v1/admin/subscriptions/stats',
    analytics: '/api/v1/admin/analytics/stats',
    referrals: '/api/v1/admin/referrals/stats',
  };

  const SUPER_ADMIN_ONLY = '/api/v1/admin/admin-users/stats';
  const PRICING = '/api/v1/admin/pricing';

  beforeAll(async () => {
    await connectTestDb();
  });

  afterEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  async function tokenFor(options: {
    email: string;
    adminRole?: AdminRole | string;
    role?: 'admin' | 'super_admin';
    adminSections?: string[];
  }) {
    const role = options.role ?? (options.adminRole && typeof options.adminRole === 'string' && options.adminRole === 'SUPER_ADMIN' ? 'super_admin' : 'admin');
    const user = await User.create({
      email: options.email,
      password: 'Passw0rd!',
      fullName: 'Staff Member',
      role,
      ...(options.adminRole ? { adminRole: options.adminRole } : {}),
      ...(options.adminSections ? { adminSections: options.adminSections } : {}),
    });
    return JwtHelper.generateAccessToken({ userId: user._id.toString(), email: user.email, role });
  }

  function get(path: string, token: string) {
    return request(app).get(path).set('Authorization', `Bearer ${token}`);
  }

  /** Passing the gate is the assertion; what the handler then returns is that module's business. */
  async function expectAllowed(path: string, token: string) {
    const res = await get(path, token);
    expect({ path, status: res.status }).not.toEqual({ path, status: 403 });
  }

  async function expectRefused(path: string, token: string) {
    const res = await get(path, token);
    expect({ path, status: res.status }).toEqual({ path, status: 403 });
  }

  describe('CONTENT_MANAGER', () => {
    it('reaches content and resources', async () => {
      const token = await tokenFor({ email: 'cm@test.pbt', adminRole: 'CONTENT_MANAGER' });
      await expectAllowed(ENDPOINTS.content, token);
      await expectAllowed(ENDPOINTS.resources, token);
    });

    it('is refused billing, pricing, members and everything else it was not given', async () => {
      const token = await tokenFor({ email: 'cm2@test.pbt', adminRole: 'CONTENT_MANAGER' });
      await expectRefused(ENDPOINTS.subscriptions, token);
      await expectRefused(PRICING, token);
      await expectRefused(ENDPOINTS.members, token);
      await expectRefused(ENDPOINTS.community, token);
      await expectRefused(ENDPOINTS.analytics, token);
      await expectRefused(ENDPOINTS.referrals, token);
    });

    it('cannot reach the super-admin-only areas', async () => {
      const token = await tokenFor({ email: 'cm3@test.pbt', adminRole: 'CONTENT_MANAGER' });
      await expectRefused(SUPER_ADMIN_ONLY, token);
      const settings = await request(app)
        .put('/api/v1/admin/site-settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ workshopLabel: 'Hijacked' });
      expect(settings.status).toBe(403);
    });
  });

  describe('COMMUNITY_MODERATOR', () => {
    it('reaches community and events, and nothing else by default', async () => {
      const token = await tokenFor({ email: 'mod@test.pbt', adminRole: 'COMMUNITY_MODERATOR' });
      await expectAllowed(ENDPOINTS.community, token);
      await expectAllowed(ENDPOINTS.events, token);
      await expectRefused(ENDPOINTS.content, token);
      await expectRefused(ENDPOINTS.subscriptions, token);
      await expectRefused(ENDPOINTS.members, token);
    });
  });

  describe('SUPPORT_STAFF', () => {
    it('reaches members, and nothing else by default', async () => {
      const token = await tokenFor({ email: 'support@test.pbt', adminRole: 'SUPPORT_STAFF' });
      await expectAllowed(ENDPOINTS.members, token);
      await expectRefused(ENDPOINTS.content, token);
      await expectRefused(ENDPOINTS.community, token);
      await expectRefused(PRICING, token);
    });
  });

  describe('ADMIN', () => {
    it('reaches every section by default', async () => {
      const token = await tokenFor({ email: 'admin@test.pbt', adminRole: 'ADMIN' });
      for (const path of Object.values(ENDPOINTS)) await expectAllowed(path, token);
      await expectAllowed(PRICING, token);
    });

    it('still cannot manage other admin accounts -- that is super admin only', async () => {
      const token = await tokenFor({ email: 'admin2@test.pbt', adminRole: 'ADMIN' });
      await expectRefused(SUPER_ADMIN_ONLY, token);
    });

    it('can be restricted by a super admin, and the restriction bites immediately', async () => {
      const token = await tokenFor({
        email: 'admin3@test.pbt',
        adminRole: 'ADMIN',
        adminSections: ['content'],
      });
      await expectAllowed(ENDPOINTS.content, token);
      await expectRefused(ENDPOINTS.subscriptions, token);
      await expectRefused(ENDPOINTS.members, token);
    });
  });

  describe('SUPER_ADMIN', () => {
    it('reaches everything, including the areas no section can grant', async () => {
      const token = await tokenFor({ email: 'super@test.pbt', adminRole: 'SUPER_ADMIN', role: 'super_admin' });
      for (const path of Object.values(ENDPOINTS)) await expectAllowed(path, token);
      await expectAllowed(PRICING, token);
      await expectAllowed(SUPER_ADMIN_ONLY, token);
    });
  });

  describe('accounts that predate the role model', () => {
    it('treats an admin with no adminRole as a plain Admin', async () => {
      // Everything the CLI script created before it set a role.
      const token = await tokenFor({ email: 'legacy@test.pbt', role: 'admin' });
      await expectAllowed(ENDPOINTS.content, token);
      await expectAllowed(ENDPOINTS.subscriptions, token);
      await expectRefused(SUPER_ADMIN_ONLY, token);
    });

    it('honours a legacy display-string role exactly like its canonical form', async () => {
      // A database mid-migration must gate identically to a migrated one.
      const token = await tokenFor({ email: 'legacy2@test.pbt', adminRole: 'Content Manager' });
      await expectAllowed(ENDPOINTS.content, token);
      await expectRefused(ENDPOINTS.subscriptions, token);
    });
  });

  describe('a deliberate lockout', () => {
    it('stays locked out instead of falling back to the role defaults', async () => {
      const token = await tokenFor({
        email: 'lockedout@test.pbt',
        adminRole: 'CONTENT_MANAGER',
        adminSections: [],
      });
      await expectRefused(ENDPOINTS.content, token);
      await expectRefused(ENDPOINTS.resources, token);
    });
  });

  describe('a permission change takes effect without a new token', () => {
    it('refuses the next request after a section is taken away', async () => {
      const token = await tokenFor({ email: 'revoked@test.pbt', adminRole: 'ADMIN' });
      await expectAllowed(ENDPOINTS.subscriptions, token);

      // The gate re-reads the account on every request, so this needs no
      // re-login -- the same still-valid token is now refused.
      await User.updateOne({ email: 'revoked@test.pbt' }, { $set: { adminSections: ['content'] } });

      await expectRefused(ENDPOINTS.subscriptions, token);
      await expectAllowed(ENDPOINTS.content, token);
    });
  });

  describe('the coarse role still guards the door', () => {
    it('refuses a member holding every section name imaginable', async () => {
      const user = await User.create({
        email: 'sneaky@test.pbt',
        password: 'Passw0rd!',
        fullName: 'Sneaky Member',
        role: 'member',
        adminSections: ['content', 'subscriptions', 'members'],
      });
      const token = JwtHelper.generateAccessToken({ userId: user._id.toString(), email: user.email, role: 'member' });

      await expectRefused(ENDPOINTS.content, token);
      await expectRefused(ENDPOINTS.subscriptions, token);
    });

    it('maps every non-super role onto the coarse admin role', () => {
      expect(toBackendRole('CONTENT_MANAGER')).toBe('admin');
      expect(toBackendRole('SUPER_ADMIN')).toBe('super_admin');
    });
  });
});

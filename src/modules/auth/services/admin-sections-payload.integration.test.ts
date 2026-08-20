import request from 'supertest';
import { createApp } from '@/app';
import { connectTestDb, clearTestDb, disconnectTestDb } from '@/testing/db';
import { User } from '@/modules/users/schemas/User.schema';
import { ADMIN_SECTIONS } from '@/core/auth/adminAccess';

/**
 * The admin portal builds its sidebar and route guard from the role and
 * section grants on the logged-in account. Neither was ever sent to the
 * client, so the portal had nothing to go on and showed every admin all ten
 * sections -- a staff account granted only Content saw Members, Billing and
 * Analytics, opened them, and hit 403s from an API that had been gating
 * correctly the whole time.
 *
 * The sections in this payload are the *effective* ones, resolved exactly
 * as the gates resolve them, so what the portal renders and what the API
 * allows cannot disagree. These assert that contract, so it can't silently
 * go missing again.
 */
describe('auth payload carries admin section grants', () => {
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

  async function seed(options: {
    email: string;
    role: 'member' | 'admin' | 'super_admin';
    adminRole?: string;
    adminSections?: string[];
  }) {
    await User.create({
      email: options.email,
      password: 'Passw0rd!',
      fullName: 'Test Person',
      role: options.role,
      ...(options.adminRole ? { adminRole: options.adminRole } : {}),
      ...(options.adminSections ? { adminSections: options.adminSections } : {}),
    });
  }

  async function login(email: string, path = '/api/v1/auth/login') {
    return request(app).post(path).send({ email, password: 'Passw0rd!' });
  }

  it('sends a restricted admin exactly the sections they hold', async () => {
    await seed({ email: 'content@test.pbt', role: 'admin', adminSections: ['content', 'resources'] });

    const res = await login('content@test.pbt', '/api/v1/auth/admin/login');

    expect(res.status).toBe(200);
    expect(res.body.data.user.adminSections).toEqual(['content', 'resources']);
  });

  it('sends the role alongside the sections, as a canonical constant', async () => {
    await seed({ email: 'cm@test.pbt', role: 'admin', adminRole: 'CONTENT_MANAGER' });

    const res = await login('cm@test.pbt', '/api/v1/auth/admin/login');

    expect(res.body.data.user.adminRole).toBe('CONTENT_MANAGER');
    expect(res.body.data.user.adminSections).toEqual(['content', 'resources']);
  });

  it('sends an uncustomised admin its role defaults, not an empty list', async () => {
    // An account nobody has customised must not log into an empty portal --
    // it holds what its role grants, and the payload says so.
    await seed({ email: 'ungranted@test.pbt', role: 'admin' });

    const res = await login('ungranted@test.pbt', '/api/v1/auth/admin/login');

    expect(res.body.data.user.adminRole).toBe('ADMIN');
    expect(res.body.data.user.adminSections).toEqual([...ADMIN_SECTIONS]);
  });

  it('sends a deliberately locked-out account an empty list', async () => {
    await seed({ email: 'locked@test.pbt', role: 'admin', adminRole: 'CONTENT_MANAGER', adminSections: [] });

    const res = await login('locked@test.pbt', '/api/v1/auth/admin/login');

    expect(res.body.data.user.adminSections).toEqual([]);
  });

  it('sends a super_admin every section, since it bypasses the checks entirely', async () => {
    await seed({ email: 'super@test.pbt', role: 'super_admin' });

    const res = await login('super@test.pbt', '/api/v1/auth/admin/login');

    expect(res.body.data.user.adminRole).toBe('SUPER_ADMIN');
    expect(res.body.data.user.adminSections).toEqual([...ADMIN_SECTIONS]);
  });

  it('omits the field for a member, who has no sections to speak of', async () => {
    await seed({ email: 'member@test.pbt', role: 'member' });

    const res = await login('member@test.pbt');

    expect(res.body.data.user.adminSections).toBeUndefined();
  });

  it('carries the grants on /auth/me too, so a page refresh keeps the right nav', async () => {
    await seed({ email: 'events@test.pbt', role: 'admin', adminRole: 'COMMUNITY_MODERATOR', adminSections: ['events'] });
    const loggedIn = await login('events@test.pbt', '/api/v1/auth/admin/login');

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loggedIn.body.data.tokens.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.adminSections).toEqual(['events']);
  });
});

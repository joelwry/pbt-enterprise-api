import request from 'supertest';
import { createApp } from '@/app';
import { connectTestDb, clearTestDb, disconnectTestDb } from '@/testing/db';
import { User } from '@/modules/users/schemas/User.schema';

/**
 * The admin portal builds its sidebar and route guard from the section
 * grants on the logged-in account. Those grants were stored and enforced
 * server-side but never sent to the client, so the portal had nothing to go
 * on and showed every admin all ten sections -- a staff account granted
 * only Content saw Members, Billing and Analytics, opened them, and hit
 * 403s from an API that had been gating correctly the whole time.
 *
 * These assert the payload the portal depends on, so it can't silently go
 * missing again.
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

  async function seed(options: { email: string; role: 'member' | 'admin' | 'super_admin'; adminSections?: string[] }) {
    await User.create({
      email: options.email,
      password: 'Passw0rd!',
      fullName: 'Test Person',
      role: options.role,
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

  it('sends an admin with no grants an empty list, not every section', async () => {
    await seed({ email: 'ungranted@test.pbt', role: 'admin' });

    const res = await login('ungranted@test.pbt', '/api/v1/auth/admin/login');

    expect(res.body.data.user.adminSections).toEqual([]);
  });

  it('sends a super_admin an empty list, since they bypass section checks entirely', async () => {
    await seed({ email: 'super@test.pbt', role: 'super_admin' });

    const res = await login('super@test.pbt', '/api/v1/auth/admin/login');

    expect(res.body.data.user.adminSections).toEqual([]);
  });

  it('omits the field for a member, who has no sections to speak of', async () => {
    await seed({ email: 'member@test.pbt', role: 'member' });

    const res = await login('member@test.pbt');

    expect(res.body.data.user.adminSections).toBeUndefined();
  });

  it('carries the grants on /auth/me too, so a page refresh keeps the right nav', async () => {
    await seed({ email: 'events@test.pbt', role: 'admin', adminSections: ['events'] });
    const loggedIn = await login('events@test.pbt', '/api/v1/auth/admin/login');

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loggedIn.body.data.tokens.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.adminSections).toEqual(['events']);
  });
});

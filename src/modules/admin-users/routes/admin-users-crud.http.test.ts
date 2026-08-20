import request from 'supertest';
import { createApp } from '@/app';
import { connectTestDb, clearTestDb, disconnectTestDb } from '@/testing/db';
import { User } from '@/modules/users/schemas/User.schema';
import { JwtHelper } from '@/core/auth/JwtHelper';
import { ADMIN_ROLES, ADMIN_SECTIONS, AdminRole, ROLE_DEFAULT_SECTIONS } from '@/core/auth/adminAccess';

/**
 * Managing staff accounts through the API a super admin actually uses:
 * every role can be created, listed, filtered, persisted and read back with
 * the section access it should have.
 *
 * The three states of `adminSections` are what these are really about --
 * never customised, customised to something, and customised to nothing --
 * because collapsing any two of them is how an account silently gains or
 * loses access.
 */
describe('Admin Users & Roles API (integration, real app + real test DB)', () => {
  const app = createApp();
  let superToken: string;

  beforeAll(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    const superAdmin = await User.create({
      email: 'boss@test.pbt',
      password: 'Passw0rd!',
      fullName: 'Big Boss',
      role: 'super_admin',
      adminRole: 'SUPER_ADMIN',
    });
    superToken = JwtHelper.generateAccessToken({
      userId: superAdmin._id.toString(),
      email: superAdmin.email,
      role: 'super_admin',
    });
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  function createAccount(body: Record<string, unknown>) {
    return request(app).post('/api/v1/admin/admin-users').set('Authorization', `Bearer ${superToken}`).send(body);
  }

  function updateAccount(id: string, body: Record<string, unknown>) {
    return request(app).patch(`/api/v1/admin/admin-users/${id}`).set('Authorization', `Bearer ${superToken}`).send(body);
  }

  function list(query: string) {
    return request(app).get(`/api/v1/admin/admin-users?${query}`).set('Authorization', `Bearer ${superToken}`);
  }

  describe('creating each role', () => {
    it.each(ADMIN_ROLES)('creates a %s holding exactly that role\'s defaults', async (role) => {
      const res = await createAccount({ fullName: `New ${role}`, email: `${role.toLowerCase()}@test.pbt`, role });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe(role);
      // No sections were sent, so the account inherits rather than being
      // locked out -- the behaviour that used to be impossible without the
      // invite form filling the array in for it.
      expect(res.body.data.sectionsCustomised).toBe(false);
      expect(res.body.data.sections).toEqual(
        role === 'SUPER_ADMIN' ? [...ADMIN_SECTIONS] : ROLE_DEFAULT_SECTIONS[role as AdminRole]
      );
    });

    it('stores the canonical constant, not a display label', async () => {
      await createAccount({ fullName: 'Cody', email: 'cody@test.pbt', role: 'CONTENT_MANAGER' });

      const stored = await User.findOne({ email: 'cody@test.pbt' }).select('role adminRole adminSections');
      expect(stored!.adminRole).toBe('CONTENT_MANAGER');
      // The coarse role every authorize() call reads stays untouched.
      expect(stored!.role).toBe('admin');
      // Absent, not empty -- that is what "inherits the defaults" looks like.
      expect(stored!.adminSections).toBeUndefined();
    });

    it('gives a Super Admin the coarse super_admin role', async () => {
      await createAccount({ fullName: 'Sasha', email: 'sasha@test.pbt', role: 'SUPER_ADMIN' });
      const stored = await User.findOne({ email: 'sasha@test.pbt' });
      expect(stored!.role).toBe('super_admin');
    });

    it('rejects a role that is not one of the five', async () => {
      const res = await createAccount({ fullName: 'Nobody', email: 'nobody@test.pbt', role: 'Content Manager' });
      expect(res.status).toBe(400);
    });

    it('rejects a section name that matches no gate', async () => {
      const res = await createAccount({
        fullName: 'Typo',
        email: 'typo@test.pbt',
        role: 'CONTENT_MANAGER',
        sections: ['content', 'subscriptons'],
      });
      expect(res.status).toBe(400);
    });
  });

  describe('customising an account', () => {
    async function seedContentManager() {
      const res = await createAccount({ fullName: 'Cody', email: 'cody@test.pbt', role: 'CONTENT_MANAGER' });
      return res.body.data.id as string;
    }

    it('persists an explicit grant and marks the account customised', async () => {
      const id = await seedContentManager();

      const res = await updateAccount(id, { sections: ['content', 'events'] });

      expect(res.status).toBe(200);
      expect(res.body.data.sections).toEqual(['content', 'events']);
      expect(res.body.data.sectionsCustomised).toBe(true);
    });

    it('keeps an empty grant empty rather than restoring the defaults', async () => {
      const id = await seedContentManager();

      const res = await updateAccount(id, { sections: [] });

      expect(res.body.data.sections).toEqual([]);
      expect(res.body.data.sectionsCustomised).toBe(true);

      // And it survives a round trip, rather than being read back as defaults.
      const reread = await request(app)
        .get(`/api/v1/admin/admin-users/${id}`)
        .set('Authorization', `Bearer ${superToken}`);
      expect(reread.body.data.sections).toEqual([]);
    });

    it('resets back to the role defaults on request', async () => {
      const id = await seedContentManager();
      await updateAccount(id, { sections: [] });

      const res = await updateAccount(id, { resetSectionsToRoleDefaults: true });

      expect(res.body.data.sections).toEqual(ROLE_DEFAULT_SECTIONS.CONTENT_MANAGER);
      expect(res.body.data.sectionsCustomised).toBe(false);
      const stored = await User.findOne({ email: 'cody@test.pbt' });
      expect(stored!.adminSections).toBeUndefined();
    });

    it('re-defaults the sections when the role changes', async () => {
      const id = await seedContentManager();

      const res = await updateAccount(id, { role: 'SUPPORT_STAFF' });

      expect(res.body.data.role).toBe('SUPPORT_STAFF');
      expect(res.body.data.sections).toEqual(ROLE_DEFAULT_SECTIONS.SUPPORT_STAFF);
    });

    it('drops stored grants when an account is promoted to Super Admin', async () => {
      const id = await seedContentManager();
      await updateAccount(id, { sections: ['content'] });

      const res = await updateAccount(id, { role: 'SUPER_ADMIN' });

      expect(res.body.data.sections).toEqual([...ADMIN_SECTIONS]);
      const stored = await User.findOne({ email: 'cody@test.pbt' });
      expect(stored!.adminSections).toBeUndefined();
      expect(stored!.role).toBe('super_admin');
    });
  });

  describe('listing and filtering', () => {
    beforeEach(async () => {
      for (const role of ADMIN_ROLES) {
        await createAccount({ fullName: `New ${role}`, email: `${role.toLowerCase()}@test.pbt`, role });
      }
    });

    it.each(ADMIN_ROLES)('filters to %s by its canonical value', async (role) => {
      const res = await list(`role=${role}&page=1&limit=20`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((account: { role: string }) => account.role === role)).toBe(true);
    });

    it('lists every staff account when unfiltered', async () => {
      const res = await list('role=All&page=1&limit=20');

      // Five created here, plus the super admin running the request.
      expect(res.body.data.length).toBe(ADMIN_ROLES.length + 1);
    });

    it('surfaces an account that predates the role model as a plain Admin', async () => {
      await User.create({
        email: 'legacy@test.pbt',
        password: 'Passw0rd!',
        fullName: 'Legacy Admin',
        role: 'admin',
      });

      const res = await list('role=ADMIN&page=1&limit=20');
      const legacy = res.body.data.find((a: { email: string }) => a.email === 'legacy@test.pbt');

      expect(legacy).toBeDefined();
      expect(legacy.role).toBe('ADMIN');
      expect(legacy.sections).toEqual([...ADMIN_SECTIONS]);
    });

    it('rejects a filter value outside the five roles', async () => {
      const res = await list('role=Support%20Staff');
      expect(res.status).toBe(400);
    });
  });

  it('still refuses to delete a Super Admin', async () => {
    const created = await createAccount({ fullName: 'Sasha', email: 'sasha@test.pbt', role: 'SUPER_ADMIN' });

    const res = await request(app)
      .delete(`/api/v1/admin/admin-users/${created.body.data.id}`)
      .set('Authorization', `Bearer ${superToken}`);

    expect(res.status).toBe(400);
  });
});

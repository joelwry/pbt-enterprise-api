import {
  ADMIN_SECTIONS,
  ROLE_DEFAULT_SECTIONS,
  canAccessSection,
  hasCustomSections,
  resolveAdminRole,
  resolveAdminSections,
  toBackendRole,
} from '@/core/auth/adminAccess';

/**
 * The resolution rules every gate, payload and admin screen depends on.
 *
 * These are pure -- no database, no Express -- because the rules themselves
 * are where the subtlety lives: an absent section list and an empty one
 * mean opposite things, and a role can arrive canonical, as a legacy
 * display string, or missing entirely.
 */
describe('admin role resolution', () => {
  it('reads a canonical role straight through', () => {
    expect(resolveAdminRole({ role: 'admin', adminRole: 'CONTENT_MANAGER' })).toBe('CONTENT_MANAGER');
  });

  it('translates the display strings this column used to hold', () => {
    // A database that hasn't run the migration yet must not silently
    // resolve to a default and widen someone's access.
    expect(resolveAdminRole({ role: 'admin', adminRole: 'Content Manager' })).toBe('CONTENT_MANAGER');
    expect(resolveAdminRole({ role: 'admin', adminRole: 'Support Staff' })).toBe('SUPPORT_STAFF');
    expect(resolveAdminRole({ role: 'super_admin', adminRole: 'Super Admin' })).toBe('SUPER_ADMIN');
  });

  it('infers a role for accounts that have never had one', () => {
    // Every account the CLI script created before this existed, and every
    // admin predating the field.
    expect(resolveAdminRole({ role: 'admin' })).toBe('ADMIN');
    expect(resolveAdminRole({ role: 'super_admin' })).toBe('SUPER_ADMIN');
  });

  it('ignores an unrecognised value rather than trusting it', () => {
    expect(resolveAdminRole({ role: 'admin', adminRole: 'Wizard' })).toBe('ADMIN');
  });

  it('gives members no admin role at all', () => {
    expect(resolveAdminRole({ role: 'member', adminRole: 'SUPER_ADMIN' })).toBeNull();
  });

  it('collapses every non-super role onto the coarse admin role', () => {
    expect(toBackendRole('SUPER_ADMIN')).toBe('super_admin');
    expect(toBackendRole('ADMIN')).toBe('admin');
    expect(toBackendRole('CONTENT_MANAGER')).toBe('admin');
    expect(toBackendRole('COMMUNITY_MODERATOR')).toBe('admin');
    expect(toBackendRole('SUPPORT_STAFF')).toBe('admin');
  });
});

describe('section resolution', () => {
  it("falls back to the role's defaults when nothing was ever customised", () => {
    expect(resolveAdminSections({ role: 'admin', adminRole: 'CONTENT_MANAGER' })).toEqual(['content', 'resources']);
    expect(resolveAdminSections({ role: 'admin', adminRole: 'COMMUNITY_MODERATOR' })).toEqual(['community', 'events']);
    expect(resolveAdminSections({ role: 'admin', adminRole: 'SUPPORT_STAFF' })).toEqual(['members']);
  });

  it('gives a plain Admin broad access by default', () => {
    // The point of the defaults: an admin created without the invite form
    // must not land in an empty portal.
    expect(resolveAdminSections({ role: 'admin', adminRole: 'ADMIN' })).toEqual([...ADMIN_SECTIONS]);
    expect(resolveAdminSections({ role: 'admin' })).toEqual([...ADMIN_SECTIONS]);
  });

  it('honours an explicit empty list as a deliberate lockout', () => {
    // The distinction this whole model turns on: collapsing [] into "use
    // defaults" would silently hand a locked-out account its role's access
    // back.
    expect(resolveAdminSections({ role: 'admin', adminRole: 'CONTENT_MANAGER', adminSections: [] })).toEqual([]);
    expect(canAccessSection({ role: 'admin', adminRole: 'CONTENT_MANAGER', adminSections: [] }, 'content')).toBe(false);
  });

  it('honours explicit grants that differ from the defaults, in both directions', () => {
    const narrowed = { role: 'admin', adminRole: 'CONTENT_MANAGER', adminSections: ['content'] };
    expect(canAccessSection(narrowed, 'content')).toBe(true);
    expect(canAccessSection(narrowed, 'resources')).toBe(false);

    const widened = { role: 'admin', adminRole: 'SUPPORT_STAFF', adminSections: ['members', 'subscriptions'] };
    expect(canAccessSection(widened, 'subscriptions')).toBe(true);
  });

  it('drops section names it does not recognise', () => {
    expect(resolveAdminSections({ role: 'admin', adminRole: 'ADMIN', adminSections: ['content', 'wizardry'] })).toEqual(['content']);
  });

  it('gives a super admin everything, whatever the column says', () => {
    expect(resolveAdminSections({ role: 'super_admin', adminRole: 'SUPER_ADMIN', adminSections: [] })).toEqual([...ADMIN_SECTIONS]);
    expect(canAccessSection({ role: 'super_admin', adminSections: [] }, 'subscriptions')).toBe(true);
  });

  it('gives a member nothing', () => {
    expect(resolveAdminSections({ role: 'member' })).toEqual([]);
    expect(canAccessSection({ role: 'member', adminSections: ['content'] }, 'content')).toBe(false);
  });

  it('distinguishes customised from inherited', () => {
    expect(hasCustomSections({ role: 'admin', adminRole: 'ADMIN' })).toBe(false);
    expect(hasCustomSections({ role: 'admin', adminRole: 'ADMIN', adminSections: [] })).toBe(true);
    expect(hasCustomSections({ role: 'admin', adminRole: 'ADMIN', adminSections: ['content'] })).toBe(true);
  });
});

describe('role defaults', () => {
  it('keeps the specialist roles away from billing and sensitive areas', () => {
    for (const role of ['CONTENT_MANAGER', 'COMMUNITY_MODERATOR', 'SUPPORT_STAFF'] as const) {
      expect(ROLE_DEFAULT_SECTIONS[role]).not.toContain('subscriptions');
      expect(ROLE_DEFAULT_SECTIONS[role]).not.toContain('analytics');
    }
    expect(ROLE_DEFAULT_SECTIONS.CONTENT_MANAGER).not.toContain('members');
    expect(ROLE_DEFAULT_SECTIONS.COMMUNITY_MODERATOR).not.toContain('content');
    expect(ROLE_DEFAULT_SECTIONS.SUPPORT_STAFF).not.toContain('content');
  });

  it('only ever names real sections', () => {
    for (const sections of Object.values(ROLE_DEFAULT_SECTIONS)) {
      for (const section of sections) expect(ADMIN_SECTIONS).toContain(section);
    }
  });
});

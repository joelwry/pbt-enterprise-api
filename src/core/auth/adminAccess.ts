/**
 * The PBT admin access model, in one place.
 *
 * Two axes, deliberately kept separate:
 *
 * - `User.role` stays the coarse gate every route file's `authorize()` call
 *   reads: `admin` or `super_admin`, nothing more. It is what the JWT
 *   carries and it is not changing -- widening it would mean touching all
 *   twelve admin route files and every `authorize()` call to let the new
 *   roles through at all.
 * - `User.adminRole` is the real, first-class staff role: one of the five
 *   below. It decides which sections the account gets *by default*, and
 *   collapses onto the coarse role via toBackendRole().
 *
 * Section grants sit on top of the role and stay the thing actually
 * enforced, by requireSection() on every admin route.
 *
 * This module holds no database or Express dependencies on purpose -- the
 * schema, the middleware, the services and the scripts all import from
 * here, so a role or a section is defined exactly once on this side of the
 * wire. (The frontend keeps its own copy of the same vocabulary; the two
 * repos share no package by design -- see ARCHITECTURE_HANDBOOK.md §1.)
 */

export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'COMMUNITY_MODERATOR', 'SUPPORT_STAFF'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

/** The coarse `User.role` values that can hold an adminRole at all. */
export type BackendAdminRole = 'admin' | 'super_admin';

/** Display strings. The API emits the canonical constant; these exist so labels are defined next to the values they describe rather than only in the frontend. */
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  CONTENT_MANAGER: 'Content Manager',
  COMMUNITY_MODERATOR: 'Community Moderator',
  SUPPORT_STAFF: 'Support Staff',
};

/**
 * The display strings this field used to be stored as, before adminRole
 * became authoritative. Kept so a document written by the old code (or by
 * an environment that hasn't run the migration yet) still resolves to the
 * right role instead of falling through to a default that would silently
 * widen or narrow someone's access. See scripts/migrate-admin-roles.ts.
 */
const LEGACY_ADMIN_ROLE_ALIASES: Record<string, AdminRole> = {
  'Super Admin': 'SUPER_ADMIN',
  Admin: 'ADMIN',
  'Content Manager': 'CONTENT_MANAGER',
  'Community Moderator': 'COMMUNITY_MODERATOR',
  'Support Staff': 'SUPPORT_STAFF',
};

/** Every value the `adminRole` column may hold -- canonical constants plus the legacy display strings, so the migration can run after the deploy rather than in lockstep with it. */
export const ADMIN_ROLE_SCHEMA_VALUES: string[] = [...ADMIN_ROLES, ...Object.keys(LEGACY_ADMIN_ROLE_ALIASES)];

export const ADMIN_SECTIONS = [
  'members',
  'content',
  'resources',
  'events',
  'community',
  'pbtLeaders',
  'powerTeam',
  'subscriptions',
  'analytics',
  'referrals',
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

const ADMIN_SECTION_SET = new Set<string>(ADMIN_SECTIONS);

export function isAdminSection(value: string): value is AdminSection {
  return ADMIN_SECTION_SET.has(value);
}

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value);
}

/**
 * Sections each role starts with. This is the server-side source of truth:
 * it used to live only in the frontend as form-prefill data, which meant
 * any account created without the browser involved (the CLI script, a seed,
 * a direct API call) got no sections at all and logged into an empty
 * portal.
 *
 * Support Staff deliberately gets `members` only: their job is answering
 * member questions, so no billing configuration, no content administration
 * and no site settings unless a super admin grants them explicitly.
 */
export const ROLE_DEFAULT_SECTIONS: Record<AdminRole, AdminSection[]> = {
  SUPER_ADMIN: [...ADMIN_SECTIONS],
  ADMIN: [...ADMIN_SECTIONS],
  CONTENT_MANAGER: ['content', 'resources'],
  COMMUNITY_MODERATOR: ['community', 'events'],
  SUPPORT_STAFF: ['members'],
};

/** The subset of a user document this module needs. Keeps it free of any Mongoose import, so the schema can depend on it rather than the other way round. */
export interface AdminAccessSubject {
  role: string;
  adminRole?: string | null;
  adminSections?: string[] | null;
}

/**
 * The account's role, tolerating anything an older write may have left
 * behind: a canonical value wins, a legacy display string is translated,
 * and an account that has never had one at all (every account created by
 * the CLI script, and every admin that predates the field) falls back to
 * what its coarse role implies.
 */
export function resolveAdminRole(user: AdminAccessSubject): AdminRole | null {
  if (user.role !== 'admin' && user.role !== 'super_admin') return null;

  const stored = user.adminRole ?? undefined;
  if (stored) {
    if (isAdminRole(stored)) return stored;
    const legacy = LEGACY_ADMIN_ROLE_ALIASES[stored];
    if (legacy) return legacy;
  }

  return user.role === 'super_admin' ? 'SUPER_ADMIN' : 'ADMIN';
}

/** Whether this account's sections have been set explicitly, as opposed to inheriting its role's defaults. `[]` counts as customised -- see resolveAdminSections(). */
export function hasCustomSections(user: AdminAccessSubject): boolean {
  return Array.isArray(user.adminSections);
}

/**
 * The sections this account can actually reach -- the one function every
 * gate, payload and display should ask.
 *
 * The distinction that matters: `undefined` means nobody has ever
 * customised this account, so it inherits its role's defaults; `[]` means a
 * super admin deliberately took every section away, and is honoured as-is.
 * Collapsing those two would mean an intentional lockout silently restoring
 * itself as full default access.
 *
 * A Super Admin bypasses the whole question and always holds everything.
 */
export function resolveAdminSections(user: AdminAccessSubject): AdminSection[] {
  const role = resolveAdminRole(user);
  if (role === null) return [];
  if (role === 'SUPER_ADMIN' || user.role === 'super_admin') return [...ADMIN_SECTIONS];

  if (hasCustomSections(user)) {
    // Unknown strings are dropped rather than kept: a section that matches
    // no gate can never grant anything, and carrying it into a payload just
    // invites a frontend lookup to break on it.
    return (user.adminSections as string[]).filter(isAdminSection);
  }

  return [...ROLE_DEFAULT_SECTIONS[role]];
}

export function canAccessSection(user: AdminAccessSubject, section: AdminSection): boolean {
  if (user.role === 'super_admin') return true;
  return resolveAdminSections(user).includes(section);
}

/**
 * Which coarse role an adminRole maps onto. Only Super Admin earns
 * `super_admin`; every other staff role is a plain `admin` as far as
 * `authorize()` is concerned, and is then separated from the others by its
 * sections. This mapping is what lets the five roles exist without
 * rewriting a single route file.
 */
export function toBackendRole(adminRole: AdminRole): BackendAdminRole {
  return adminRole === 'SUPER_ADMIN' ? 'super_admin' : 'admin';
}

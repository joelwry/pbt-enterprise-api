/**
 * Seeds one admin account per staff role, for testing the access model
 * end to end.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-admin-staff.ts
 *
 * All five share the password below. None of them get explicit section
 * grants -- that is the point: each one should land in the portal holding
 * exactly its role's defaults, which is the behaviour that used to be
 * impossible because sections only ever came from the invite form.
 *
 * The sixth account is the exception that proves the rule: a Content
 * Manager whose grants have been customised away to nothing, to check that
 * an explicit empty list stays empty rather than falling back to the
 * role's defaults.
 */
import { connectDB, disconnectDB } from '@/database/connection';
import { User } from '@/modules/users/schemas/User.schema';
import { ADMIN_ROLES, AdminRole, ROLE_DEFAULT_SECTIONS, toBackendRole } from '@/core/auth/adminAccess';

const PASSWORD = 'StaffPass123!';

const STAFF: { email: string; fullName: string; adminRole: AdminRole }[] = [
  { email: 'staff.super@pbt.test', fullName: 'Sasha Super', adminRole: 'SUPER_ADMIN' },
  { email: 'staff.admin@pbt.test', fullName: 'Aria Admin', adminRole: 'ADMIN' },
  { email: 'staff.content@pbt.test', fullName: 'Cody Content', adminRole: 'CONTENT_MANAGER' },
  { email: 'staff.community@pbt.test', fullName: 'Mo Moderator', adminRole: 'COMMUNITY_MODERATOR' },
  { email: 'staff.support@pbt.test', fullName: 'Sam Support', adminRole: 'SUPPORT_STAFF' },
];

const LOCKED_OUT = {
  email: 'staff.lockedout@pbt.test',
  fullName: 'Lee Lockedout',
  adminRole: 'CONTENT_MANAGER' as AdminRole,
};

async function upsert(input: { email: string; fullName: string; adminRole: AdminRole; adminSections?: string[] }) {
  const role = toBackendRole(input.adminRole);
  const existing = await User.findOne({ email: input.email });

  if (existing) {
    existing.fullName = input.fullName;
    existing.role = role;
    existing.adminRole = input.adminRole;
    existing.adminSections = input.adminSections;
    existing.password = PASSWORD;
    existing.emailVerified = true;
    existing.isActive = true;
    await existing.save();
  } else {
    await User.create({
      email: input.email,
      password: PASSWORD,
      fullName: input.fullName,
      role,
      adminRole: input.adminRole,
      adminSections: input.adminSections,
      emailVerified: true,
      isActive: true,
    });
  }
}

async function main() {
  await connectDB();

  for (const staff of STAFF) {
    await upsert(staff);
    const defaults = staff.adminRole === 'SUPER_ADMIN' ? ['(everything)'] : ROLE_DEFAULT_SECTIONS[staff.adminRole];
    console.log(`${staff.email.padEnd(30)} ${staff.adminRole.padEnd(20)} defaults: ${defaults.join(', ')}`);
  }

  await upsert({ ...LOCKED_OUT, adminSections: [] });
  console.log(`${LOCKED_OUT.email.padEnd(30)} ${LOCKED_OUT.adminRole.padEnd(20)} explicitly customised to: (none)`);

  console.log(`\nAll ${ADMIN_ROLES.length} roles seeded. Shared password: ${PASSWORD}`);

  await disconnectDB();
}

main().catch(async (error) => {
  console.error(error);
  await disconnectDB();
  process.exit(1);
});

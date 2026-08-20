/**
 * Migrates `User.adminRole` onto the canonical role constants.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-admin-roles.ts [--dry-run]
 *
 * Two things happen, both idempotent -- running it twice is a no-op:
 *
 * 1. Accounts written before adminRole became authoritative hold display
 *    strings ("Content Manager"). Those become CONTENT_MANAGER and friends.
 * 2. Accounts with no adminRole at all -- everything the CLI script ever
 *    created, and every admin predating the field -- are backfilled from
 *    their coarse role: super_admin becomes SUPER_ADMIN, admin becomes
 *    ADMIN. That matches what resolveAdminRole() already infers for them at
 *    runtime, so it changes nobody's access; it just makes the stored value
 *    say what the system was already assuming.
 *
 * Section grants are deliberately left alone. An account with no explicit
 * grants inherits its role's defaults, and writing those defaults into the
 * column would turn "never customised" into "explicitly set to exactly
 * this" -- losing the distinction that lets a super admin later reset an
 * account back to its role's defaults.
 */
import { connectDB, disconnectDB } from '@/database/connection';
import { User } from '@/modules/users/schemas/User.schema';
import { ADMIN_ROLES, isAdminRole, resolveAdminRole } from '@/core/auth/adminAccess';
import logger from '@/core/logger/logger';

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  await connectDB();

  const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } }).select('email role adminRole');

  const planned: { email: string; from: string; to: string }[] = [];
  for (const user of admins) {
    const current = user.adminRole ?? undefined;
    if (current && isAdminRole(current)) continue;

    const resolved = resolveAdminRole(user);
    if (!resolved) continue;

    planned.push({ email: user.email, from: current ?? '(none)', to: resolved });
  }

  console.log(`${admins.length} admin account(s) found; ${planned.length} need migrating.`);
  for (const change of planned) {
    console.log(`  ${change.email}: ${change.from} -> ${change.to}`);
  }

  if (dryRun) {
    console.log('\n--dry-run: nothing written.');
  } else {
    for (const change of planned) {
      await User.updateOne({ email: change.email }, { $set: { adminRole: change.to } });
    }
    if (planned.length > 0) {
      logger.info('Admin roles migrated to canonical constants', { count: planned.length });
    }
    console.log(`\nMigrated ${planned.length} account(s).`);
  }

  // A tally by role, so it's obvious at a glance that every admin now holds
  // one of the five and nothing was left behind.
  const remaining = await User.find({ role: { $in: ['admin', 'super_admin'] } }).select('adminRole role');
  const counts = new Map<string, number>(ADMIN_ROLES.map((role) => [role, 0]));
  let unresolved = 0;
  for (const user of remaining) {
    const role = user.adminRole;
    if (role && isAdminRole(role)) counts.set(role, (counts.get(role) ?? 0) + 1);
    else unresolved += 1;
  }

  console.log('\nAdmin accounts by role:');
  for (const [role, count] of counts) console.log(`  ${role.padEnd(20)} ${count}`);
  if (unresolved > 0) console.log(`  ${'(unmigrated)'.padEnd(20)} ${unresolved}`);

  await disconnectDB();
  process.exit(unresolved > 0 && !dryRun ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await disconnectDB();
  process.exit(1);
});

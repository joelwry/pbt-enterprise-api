/**
 * Create an admin-portal user for local/staging testing.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/create-admin.ts \
 *     --email=admin@pbt.test --password=Passw0rd! --name="Ada Admin" --role=ADMIN
 *
 * --role takes one of the five staff roles (default: ADMIN):
 *   SUPER_ADMIN, ADMIN, CONTENT_MANAGER, COMMUNITY_MODERATOR, SUPPORT_STAFF
 *
 * The coarse `User.role` that `authorize()` checks is derived from it --
 * SUPER_ADMIN becomes super_admin, everything else a plain admin, separated
 * from each other by their sections. The older spelling (--role=admin /
 * --role=super_admin) still works and maps onto ADMIN / SUPER_ADMIN.
 *
 * Section grants are deliberately not set here: leaving them absent is what
 * makes the account inherit its role's defaults. This script used to set
 * neither role nor sections, so every account it created showed up as a
 * generic Admin holding nothing at all.
 */
import { connectDB, disconnectDB } from '@/database/connection';
import { User } from '@/modules/users/schemas/User.schema';
import { ADMIN_ROLES, AdminRole, isAdminRole, toBackendRole } from '@/core/auth/adminAccess';

function parseArgs() {
  const args = new Map<string, string>();
  for (const raw of process.argv.slice(2)) {
    const match = raw.match(/^--([^=]+)=(.*)$/);
    if (match) args.set(match[1], match[2]);
  }
  return args;
}

/** Accepts a canonical role, or the coarse `admin`/`super_admin` this flag used to take. */
function parseRole(value: string): AdminRole | null {
  const upper = value.toUpperCase();
  if (isAdminRole(upper)) return upper;
  if (value === 'admin') return 'ADMIN';
  if (value === 'super_admin') return 'SUPER_ADMIN';
  return null;
}

async function main() {
  const args = parseArgs();
  const email = args.get('email');
  const password = args.get('password');
  const name = args.get('name') ?? 'PBT Admin';
  const roleArg = args.get('role') ?? 'ADMIN';

  if (!email || !password) {
    console.error(`Usage: --email=<email> --password=<password> [--name="Full Name"] [--role=${ADMIN_ROLES.join('|')}]`);
    process.exit(1);
  }

  const adminRole = parseRole(roleArg);
  if (!adminRole) {
    console.error(`Invalid --role "${roleArg}". Must be one of: ${ADMIN_ROLES.join(', ')}`);
    process.exit(1);
  }

  const role = toBackendRole(adminRole);

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    existing.role = role;
    existing.adminRole = adminRole;
    existing.password = password;
    existing.emailVerified = true;
    existing.isActive = true;
    await existing.save();
    console.log(`Updated existing user "${email}" -> ${adminRole} (role=${role})`);
  } else {
    await User.create({
      email: email.toLowerCase(),
      password,
      fullName: name,
      role,
      adminRole,
      emailVerified: true,
      isActive: true,
    });
    console.log(`Created new ${adminRole} user "${email}" (role=${role})`);
  }

  console.log('Section access: this role\'s defaults (no explicit grants set).');

  await disconnectDB();
}

main().catch(async (error) => {
  console.error(error);
  await disconnectDB();
  process.exit(1);
});

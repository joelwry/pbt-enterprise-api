/**
 * Seed a small set of login-ready test accounts.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/create-test-users.ts
 *
 * Defaults to a super_admin, admin, and member user so you can test both
 * member login and admin-only routes without having to create each account one-by-one.
 */
import { connectDB, disconnectDB } from '@/database/connection';
import { User } from '@/modules/users/schemas/User.schema';

const DEFAULT_PASSWORD = 'Passw0rd!';

const TEST_USERS = [
  { email: 'superadmin@pbt.test', fullName: 'Super Admin', role: 'super_admin' as const },
  { email: 'admin@pbt.test', fullName: 'Staff Admin', role: 'admin' as const },
  { email: 'member@pbt.test', fullName: 'Test Member', role: 'member' as const },
];

function parseArgs() {
  const args = new Map<string, string>();
  for (const raw of process.argv.slice(2)) {
    const match = raw.match(/^--([^=]+)=(.*)$/);
    if (match) args.set(match[1], match[2]);
  }
  return args;
}

async function upsertUser(email: string, fullName: string, role: 'member' | 'admin' | 'super_admin', password: string) {
  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });

  if (existing) {
    existing.fullName = fullName;
    existing.role = role;
    existing.password = password;
    existing.emailVerified = true;
    existing.isActive = true;

    if (role === 'super_admin') {
      existing.adminRole = 'Super Admin';
    } else if (role === 'admin') {
      existing.adminRole = 'Admin';
    } else {
      existing.adminRole = undefined;
      existing.adminSections = undefined;
    }

    await existing.save();
    console.log(`Updated ${role}: ${normalizedEmail}`);
    return;
  }

  await User.create({
    email: normalizedEmail,
    password,
    fullName,
    role,
    emailVerified: true,
    isActive: true,
    ...(role === 'super_admin'
      ? { adminRole: 'Super Admin' }
      : role === 'admin'
        ? { adminRole: 'Admin' }
        : {}),
  });

  console.log(`Created ${role}: ${normalizedEmail}`);
}

async function main() {
  const args = parseArgs();
  const password = args.get('password') ?? DEFAULT_PASSWORD;

  await connectDB();

  for (const user of TEST_USERS) {
    await upsertUser(user.email, user.fullName, user.role, password);
  }

  console.log(`\nAll test accounts use password: ${password}`);
  console.log('Examples:');
  console.log('  - member login: POST /auth/login with member@pbt.test / Passw0rd!');
  console.log('  - admin login: POST /auth/admin/login with admin@pbt.test / Passw0rd!');
  console.log('  - super admin login: POST /auth/admin/login with superadmin@pbt.test / Passw0rd!');

  await disconnectDB();
}

main().catch(async (error) => {
  console.error(error);
  await disconnectDB();
  process.exit(1);
});

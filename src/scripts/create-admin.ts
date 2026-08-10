/**
 * Create an admin or super_admin user for local/staging testing.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/create-admin.ts \
 *     --email=admin@pbt.test --password=Passw0rd! --name="Ada Admin" --role=admin
 *
 * --role accepts "admin" or "super_admin" (default: admin). Per User.schema.ts,
 * super_admin is the highest admin role in the hierarchy, though today every
 * admin route authorizes both roles equally -- there is no route currently
 * gated to super_admin alone.
 */
import { connectDB, disconnectDB } from '@/database/connection';
import { User } from '@/modules/users/schemas/User.schema';

function parseArgs() {
  const args = new Map<string, string>();
  for (const raw of process.argv.slice(2)) {
    const match = raw.match(/^--([^=]+)=(.*)$/);
    if (match) args.set(match[1], match[2]);
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const email = args.get('email');
  const password = args.get('password');
  const name = args.get('name') ?? 'PBT Admin';
  const role = args.get('role') ?? 'admin';

  if (!email || !password) {
    console.error('Usage: --email=<email> --password=<password> [--name="Full Name"] [--role=admin|super_admin]');
    process.exit(1);
  }

  if (role !== 'admin' && role !== 'super_admin') {
    console.error(`Invalid --role "${role}". Must be "admin" or "super_admin".`);
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    existing.role = role;
    existing.password = password;
    existing.emailVerified = true;
    existing.isActive = true;
    await existing.save();
    console.log(`Updated existing user "${email}" -> role=${role}`);
  } else {
    await User.create({
      email: email.toLowerCase(),
      password,
      fullName: name,
      role,
      emailVerified: true,
      isActive: true,
    });
    console.log(`Created new ${role} user "${email}"`);
  }

  await disconnectDB();
}

main().catch(async (error) => {
  console.error(error);
  await disconnectDB();
  process.exit(1);
});

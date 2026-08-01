/**
 * Seed a spread of test member accounts across every membership tier and
 * subscription state, for manually testing tier-gating, upgrade prompts,
 * and expiry/renewal messaging.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-test-members.ts
 *
 * All seeded accounts share the password printed below unless overridden
 * with --password=<password>. Re-running is safe -- existing users/
 * subscriptions for these emails are replaced, not duplicated.
 */
import { connectDB, disconnectDB } from '@/database/connection';
import { User } from '@/modules/users/schemas/User.schema';
import { Subscription } from '@/modules/subscriptions/schemas/Subscription.schema';

type Tier = 'pathway' | 'plus' | 'mentorship';

interface SeedUser {
  email: string;
  fullName: string;
  /** Every member needs a real subscription -- Pathway is a paid tier, not a free fallback. */
  subscription: {
    tier: Tier;
    status: 'active' | 'cancelled' | 'expired';
    daysFromNowToEnd: number;
  };
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'test.pathway@pbt.test',
    fullName: 'Paula Pathway',
    subscription: { tier: 'pathway', status: 'active', daysFromNowToEnd: 25 },
  },
  {
    email: 'test.pathway.expired@pbt.test',
    fullName: 'Xavier Expired-Pathway',
    subscription: { tier: 'pathway', status: 'expired', daysFromNowToEnd: -10 },
  },
  {
    email: 'test.plus@pbt.test',
    fullName: 'Peter Plus',
    subscription: { tier: 'plus', status: 'active', daysFromNowToEnd: 25 },
  },
  {
    email: 'test.masterplan@pbt.test',
    fullName: 'Maya Masterplan',
    subscription: { tier: 'mentorship', status: 'active', daysFromNowToEnd: 25 },
  },
  {
    email: 'test.plus.expiring@pbt.test',
    fullName: 'Eli Expiring-Plus',
    subscription: { tier: 'plus', status: 'active', daysFromNowToEnd: 3 },
  },
  {
    email: 'test.masterplan.expiring@pbt.test',
    fullName: 'Mona Expiring-Masterplan',
    subscription: { tier: 'mentorship', status: 'active', daysFromNowToEnd: 3 },
  },
  {
    email: 'test.plus.expired@pbt.test',
    fullName: 'Xander Expired-Plus',
    subscription: { tier: 'plus', status: 'expired', daysFromNowToEnd: -10 },
  },
  {
    email: 'test.masterplan.expired@pbt.test',
    fullName: 'Zara Expired-Masterplan',
    subscription: { tier: 'mentorship', status: 'expired', daysFromNowToEnd: -10 },
  },
];

function parseArgs() {
  const args = new Map<string, string>();
  for (const raw of process.argv.slice(2)) {
    const match = raw.match(/^--([^=]+)=(.*)$/);
    if (match) args.set(match[1], match[2]);
  }
  return args;
}

async function main() {
  const password = parseArgs().get('password') ?? 'TestPass123!';

  await connectDB();

  for (const seed of SEED_USERS) {
    const email = seed.email.toLowerCase();
    let user = await User.findOne({ email });

    if (user) {
      user.password = password;
      user.fullName = seed.fullName;
      user.emailVerified = true;
      user.isActive = true;
      await user.save();
    } else {
      user = await User.create({
        email,
        password,
        fullName: seed.fullName,
        role: 'member',
        emailVerified: true,
        isActive: true,
      });
    }

    await Subscription.deleteMany({ userId: user._id });

    const { tier, status, daysFromNowToEnd } = seed.subscription;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysFromNowToEnd);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 1);

    await Subscription.create({
      userId: user._id,
      tier,
      status,
      startDate,
      endDate,
      autoRenew: status === 'active',
      billingCycle: 'monthly',
      amount: tier === 'pathway' ? 39 : tier === 'plus' ? 49 : 149,
      currency: 'GBP',
    });

    console.log(`Seeded ${user.email} (${tier}/${status})`);
  }

  console.log(`\nAll seeded accounts share the password: ${password}`);

  await disconnectDB();
}

main().catch(async (error) => {
  console.error(error);
  await disconnectDB();
  process.exit(1);
});

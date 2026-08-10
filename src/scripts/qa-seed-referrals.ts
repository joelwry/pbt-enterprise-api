import mongoose, { Types } from 'mongoose';
import { config } from '@/config/environment';
import { User } from '@/modules/users/schemas/User.schema';
import { Referral } from '@/modules/referrals/schemas/Referral.schema';
import { referralService } from '@/modules/referrals/services/referral.service';
import logger from '@/core/logger/logger';

async function main() {
  await mongoose.connect(config.MONGODB_URI);

  const referrer = await User.findOne({ email: 'test.pathway@pbt.test' });
  const referrer2 = await User.findOne({ email: 'test.plus@pbt.test' });
  if (!referrer || !referrer2) {
    throw new Error('Seed members not found -- run seed-test-members.ts first');
  }

  await Referral.deleteMany({
    referredUserId: {
      $in: await User.find({ email: /qa-referral-demo/ }).distinct('_id'),
    },
  });
  await User.deleteMany({ email: /qa-referral-demo/ });

  const makeReferred = (email: string, fullName: string) =>
    User.create({ email, password: 'TestPass123!', fullName, role: 'member' });

  // 1) REWARD_EARNED - Pathway, untouched (stays earned)
  const r1 = await makeReferred('qa-referral-demo-1@pbt.test', 'Demo Referred Pathway');
  await referralService.recordReferralWithFirstPayment(referrer._id.toString(), r1._id.toString(), {
    tier: 'pathway',
    billingCycle: 'monthly',
    amount: 99,
    paidAt: new Date(),
    subscriptionId: new Types.ObjectId(),
  });

  // 2) REWARD_EARNED - Plus, left for QA to manually move to PAYMENT_PENDING via the admin UI/API
  const r2 = await makeReferred('qa-referral-demo-2@pbt.test', 'Demo Referred Plus');
  await referralService.recordReferralWithFirstPayment(referrer._id.toString(), r2._id.toString(), {
    tier: 'plus',
    billingCycle: 'monthly',
    amount: 249,
    paidAt: new Date(),
    subscriptionId: new Types.ObjectId(),
  });

  // 3) REWARD_EARNED - Mentorship, left for QA to manually move to PAID via the admin UI/API
  const r3 = await makeReferred('qa-referral-demo-3@pbt.test', 'Demo Referred Mentorship');
  await referralService.recordReferralWithFirstPayment(referrer._id.toString(), r3._id.toString(), {
    tier: 'mentorship',
    billingCycle: 'monthly',
    amount: 449,
    paidAt: new Date(),
    subscriptionId: new Types.ObjectId(),
  });

  // 4) Legacy no-payment path - CUSTOMER_SIGNED_UP, permanently pending (Part 9 #7 scenario)
  const r4 = await makeReferred('qa-referral-demo-4@pbt.test', 'Demo Referred Pending');
  await referralService.recordReferral(referrer._id.toString(), r4._id.toString());

  // 5) A referral under a *different* referrer, to verify member-scoped visibility (Plus member's own hub)
  const r5 = await makeReferred('qa-referral-demo-5@pbt.test', 'Demo Referred For Plus Referrer');
  await referralService.recordReferralWithFirstPayment(referrer2._id.toString(), r5._id.toString(), {
    tier: 'pathway',
    billingCycle: 'annual',
    amount: 950,
    paidAt: new Date(),
    subscriptionId: new Types.ObjectId(),
  });

  const all = await Referral.find({}).populate('referrerId', 'email').populate('referredUserId', 'email');
  console.log('\nSeeded referrals:');
  for (const r of all) {
    console.log(
      `  ${(r.referrerId as any).email} -> ${(r.referredUserId as any).email} | status=${r.status} tier=${r.referredTier ?? '-'} firstPayment=${r.firstPaymentAmount ?? '-'} reward=${r.rewardAmount ?? '-'}`
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  logger.error('qa-seed-referrals failed', { err });
  process.exit(1);
});

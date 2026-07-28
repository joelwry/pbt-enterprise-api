import crypto from 'crypto';
import { User, IUser } from '@/modules/users/schemas/User.schema';
import { Subscription, SubscriptionDocument } from '@/modules/subscriptions/schemas/Subscription.schema';
import { UserProgress } from '@/modules/progress/schemas/UserProgress.schema';
import { Activity } from '@/modules/activity/schemas/Activity.schema';
import { Leader } from '@/modules/leaders/schemas/Leader.schema';
import { authRepository } from '@/modules/auth/repositories/auth.repository';
import { subscriptionService } from '@/modules/subscriptions/services/subscription.service';
import { EmailService } from '@/core/email/EmailService';
import { NotFoundError, ValidationError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

type FrontendTier = 'Pathway' | 'Plus' | 'Mentorship';
type BackendTier = 'pathway' | 'plus' | 'mentorship';

const CONTRACT_LABEL: Record<FrontendTier, string> = {
  Pathway: 'No contract',
  Plus: '6-mo contract',
  Mentorship: '12-mo renewable',
};

function toFrontendTier(tier: BackendTier): FrontendTier {
  return (tier.charAt(0).toUpperCase() + tier.slice(1)) as FrontendTier;
}

function toBackendTier(tier: FrontendTier): BackendTier {
  return tier.toLowerCase() as BackendTier;
}

function initialsOf(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

function joinedLabelOf(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface ListParams {
  tier: FrontendTier | 'All';
  search?: string;
  page: number;
  limit: number;
}

export class AdminMembersService {
  /**
   * Real tally over the actual User/Subscription collections -- no fabricated
   * numbers. "Failed Payments" is honestly 0: there's no real payment
   * gateway yet (see Premium paths / Stripe follow-up in the progress log),
   * so nothing can genuinely fail a payment until that's wired up.
   */
  async getStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalMembers, newMembersThisWeek, newMembersLastMonth, pausedAccounts] = await Promise.all([
      User.countDocuments({ role: 'member' }),
      User.countDocuments({ role: 'member', createdAt: { $gte: weekAgo } }),
      User.countDocuments({ role: 'member', createdAt: { $gte: monthAgo } }),
      User.countDocuments({ role: 'member', isActive: false }),
    ]);

    return {
      totalMembers,
      totalMembersDeltaLabel: `${newMembersLastMonth} this month`,
      newMembersThisWeek,
      failedPayments: 0,
      pausedAccounts,
    };
  }

  private async currentTierAndContract(userId: string): Promise<{ tier: FrontendTier; subscription: SubscriptionDocument | null }> {
    const subscription = await subscriptionService.getCurrentSubscription(userId);
    const tier = subscription ? toFrontendTier(subscription.tier) : 'Pathway';
    return { tier, subscription };
  }

  async listMembers({ tier, search, page, limit }: ListParams) {
    const filter: Record<string, unknown> = { role: 'member' };
    const q = search?.trim();
    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    // Client ID search is a raw ObjectId match on _id (the app uses userId as
    // clientId everywhere) -- only attempt it when the query looks like one,
    // otherwise Mongoose throws a cast error on a partial/invalid id.
    if (q && /^[a-f0-9]{6,24}$/i.test(q)) {
      filter.$or = [...((filter.$or as unknown[]) ?? []), { _id: { $regex: `^${q}`, $options: 'i' } }];
    }

    const [allMatching, totalUsers] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    const subs = await Subscription.find({
      userId: { $in: allMatching.map((u) => u._id) },
      status: 'active',
      endDate: { $gt: new Date() },
    });
    const subByUser = new Map(subs.map((s) => [s.userId.toString(), s]));

    const withTier = allMatching.map((user) => {
      const sub = subByUser.get(user._id.toString());
      const memberTier: FrontendTier = sub ? toFrontendTier(sub.tier) : 'Pathway';
      return { user, sub: sub ?? null, tier: memberTier };
    });

    const filtered = tier === 'All' ? withTier : withTier.filter((m) => m.tier === tier);
    const totalItems = filtered.length;
    const start = (page - 1) * limit;
    const pageItems = filtered.slice(start, start + limit);

    const items = pageItems.map(({ user, tier: memberTier }) => ({
      id: user._id.toString(),
      clientId: user._id.toString(),
      fullName: user.fullName,
      initials: initialsOf(user.fullName),
      email: user.email,
      tier: memberTier,
      joinedLabel: joinedLabelOf(user.createdAt),
      status: (user.isActive ? 'Active' : 'Paused') as 'Active' | 'Payment Failed' | 'Paused',
      contractLabel: CONTRACT_LABEL[memberTier],
    }));

    return { items, totalItems, totalUsersScanned: totalUsers };
  }

  async getMemberById(id: string) {
    const user = await User.findOne({ _id: id, role: 'member' });
    if (!user) throw new NotFoundError('Member not found');

    const { tier, subscription } = await this.currentTierAndContract(id);

    const [progress, leader, recentActivity] = await Promise.all([
      UserProgress.findOne({ userId: id }),
      user.assignedLeader ? Leader.findById(user.assignedLeader) : null,
      Activity.find({ memberId: id }).sort({ createdAt: -1 }).limit(20),
    ]);

    return {
      id: user._id.toString(),
      clientId: user._id.toString(),
      fullName: user.fullName,
      initials: initialsOf(user.fullName),
      email: user.email,
      phone: user.phone ?? '',
      location: user.location ?? '',
      assignedLeader: leader?.fullName ?? 'Not assigned',
      assignedLeaderId: user.assignedLeader ?? null,
      tier,
      joinedLabel: joinedLabelOf(user.createdAt),
      memberSinceLabel: joinedLabelOf(user.createdAt),
      status: (user.isActive ? 'Active' : 'Paused') as 'Active' | 'Payment Failed' | 'Paused',
      contractLabel: CONTRACT_LABEL[tier],
      contractTypeLabel: CONTRACT_LABEL[tier],
      renewalDateLabel: subscription ? joinedLabelOf(subscription.endDate) : 'No active subscription',
      paymentMethodLabel: subscription ? `${subscription.billingCycle === 'monthly' ? 'Monthly' : 'Annual'} card payment` : 'None on file',
      lessonsCompleted: progress?.completedLessonsCount ?? 0,
      studyHours: progress ? Math.round((progress.totalLearningMinutes / 60) * 10) / 10 : 0,
      recentActivity: recentActivity.map((a) => ({
        id: a._id.toString(),
        icon: (a.itemType === 'event' ? 'event' : a.itemType === 'discussion' ? 'community' : 'lesson') as 'lesson' | 'community' | 'event',
        description: a.description,
        timeAgoLabel: a.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      })),
    };
  }

  async getMemberBilling(id: string, page: number, limit: number) {
    const user = await User.findOne({ _id: id, role: 'member' });
    if (!user) throw new NotFoundError('Member not found');

    const { items, totalItems } = await subscriptionService.getBillingHistory(id, page, limit);
    return {
      items: items.map((sub) => ({
        id: sub._id.toString(),
        label: `PBT ${toFrontendTier(sub.tier)} membership`,
        dateLabel: joinedLabelOf(sub.createdAt),
        amount: sub.amount,
        status: 'Paid' as const,
      })),
      totalItems,
    };
  }

  async getMemberLearningProgress(id: string) {
    const user = await User.findOne({ _id: id, role: 'member' });
    if (!user) throw new NotFoundError('Member not found');

    const progress = await UserProgress.findOne({ userId: id });
    return {
      completedLessonsCount: progress?.completedLessonsCount ?? 0,
      completedModulesCount: progress?.completedModulesCount ?? 0,
      overallProgress: progress?.overallProgress ?? 0,
      totalLearningMinutes: progress?.totalLearningMinutes ?? 0,
      streakDays: progress?.streakDays ?? 0,
    };
  }

  /**
   * Creates a real member account with a random, never-disclosed password,
   * then emails them the same account-setup link used by the "forgot
   * password" flow -- reuses the real token mechanism rather than inventing
   * a parallel one. Email sending is best-effort: EmailService never throws
   * on a missing/failed SMTP config, so member creation always succeeds
   * even when no email credentials are configured.
   */
  async createMember(data: { fullName: string; email: string; tier: FrontendTier }) {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new ValidationError('A member with this email already exists', ['Email is already in use']);
    }

    const temporaryPassword = crypto.randomBytes(16).toString('hex');
    const user = await User.create({
      email: data.email.toLowerCase(),
      password: temporaryPassword,
      fullName: data.fullName,
      role: 'member',
      emailVerified: false,
    });

    const backendTier = toBackendTier(data.tier);
    if (backendTier !== 'pathway') {
      const amount = subscriptionService.getPriceForTier(backendTier, 'monthly');
      await Subscription.create({
        userId: user._id,
        tier: backendTier,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingCycle: 'monthly',
        amount,
        currency: 'GBP',
      });
    }

    const setupToken = await authRepository.setPasswordResetToken(user._id.toString());
    await EmailService.sendAccountSetupEmail(user.email, user.fullName, setupToken);

    logger.info(`Admin created member: ${user.email}`);
    return this.getMemberById(user._id.toString());
  }

  async updateMember(id: string, data: { fullName?: string; phone?: string; location?: string; assignedLeaderId?: string | null }) {
    const user = await User.findOne({ _id: id, role: 'member' });
    if (!user) throw new NotFoundError('Member not found');

    if (data.fullName !== undefined) user.fullName = data.fullName;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.location !== undefined) user.location = data.location;
    if (data.assignedLeaderId !== undefined) {
      user.assignedLeader = data.assignedLeaderId ?? undefined;
    }

    await user.save();
    return this.getMemberById(id);
  }

  async changeTier(id: string, tier: FrontendTier) {
    const user = await User.findOne({ _id: id, role: 'member' });
    if (!user) throw new NotFoundError('Member not found');

    const backendTier = toBackendTier(tier);
    const existing = await Subscription.findOne({ userId: id, status: 'active', endDate: { $gt: new Date() } });

    if (existing) {
      existing.tier = backendTier;
      existing.amount = subscriptionService.getPriceForTier(backendTier, existing.billingCycle);
      await existing.save();
    } else if (backendTier !== 'pathway') {
      await Subscription.create({
        userId: id,
        tier: backendTier,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingCycle: 'monthly',
        amount: subscriptionService.getPriceForTier(backendTier, 'monthly'),
        currency: 'GBP',
      });
    }

    return this.getMemberById(id);
  }

  async setPaused(id: string, paused: boolean) {
    const user = await User.findOne({ _id: id, role: 'member' });
    if (!user) throw new NotFoundError('Member not found');

    user.isActive = !paused;
    await user.save();
    return this.getMemberById(id);
  }

  async resendWelcomeEmail(id: string) {
    const user = await User.findOne({ _id: id, role: 'member' });
    if (!user) throw new NotFoundError('Member not found');

    const setupToken = await authRepository.setPasswordResetToken(user._id.toString());
    await EmailService.sendAccountSetupEmail(user.email, user.fullName, setupToken);
    return { sent: true };
  }

  async deleteMember(id: string) {
    const user = await User.findOneAndUpdate({ _id: id, role: 'member' }, { deletedAt: new Date(), isActive: false });
    if (!user) throw new NotFoundError('Member not found');
    logger.info(`Member soft-deleted: ${user.email}`);
    return { deleted: true };
  }
}

export const adminMembersService = new AdminMembersService();

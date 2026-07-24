import { Membership, IMembership, MembershipTier } from '@/modules/memberships/schemas/Membership.schema';
import { NotFoundError, AuthorizationError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

export class MembershipService {
  /**
   * Get user's current membership
   */
  async getUserMembership(userId: string): Promise<IMembership | null> {
    return Membership.findOne({
      userId,
      status: { $in: ['active', 'inactive'] },
    });
  }

  /**
   * Get active membership
   */
  async getActiveMembership(userId: string): Promise<IMembership> {
    const membership = await Membership.findOne({
      userId,
      status: 'active',
    });

    if (!membership) {
      throw new NotFoundError('No active membership found');
    }

    return membership;
  }

  /**
   * Create new membership
   */
  async createMembership(
    userId: string,
    tier: MembershipTier,
    accessibleYears: string[]
  ): Promise<IMembership> {
    const membership = new Membership({
      userId,
      tier,
      status: 'active',
      startDate: new Date(),
      accessibleYears,
      autoRenew: true,
    });

    const saved = await membership.save();
    logger.info(`Membership created: ${userId} - ${tier}`);

    return saved;
  }

  /**
   * Upgrade membership tier
   */
  async upgradeMembership(userId: string, newTier: MembershipTier): Promise<IMembership> {
    const membership = await this.getActiveMembership(userId);

    const tierHierarchy = { Pathway: 1, Plus: 2, Mentorship: 3 };

    if (tierHierarchy[newTier] <= tierHierarchy[membership.tier]) {
      throw new AuthorizationError('Can only upgrade to a higher tier');
    }

    membership.tier = newTier;
    const updated = await membership.save();

    logger.info(`Membership upgraded: ${userId} - ${membership.tier} -> ${newTier}`);

    return updated;
  }

  /**
   * Check if user can access content for tier
   */
  async canAccessTier(userId: string, requiredTier: MembershipTier): Promise<boolean> {
    const membership = await this.getUserMembership(userId);

    if (!membership || membership.status !== 'active') {
      return false;
    }

    const tierHierarchy = { Pathway: 1, Plus: 2, Mentorship: 3 };
    return tierHierarchy[membership.tier] >= tierHierarchy[requiredTier];
  }

  /**
   * Check if user can access year
   */
  async canAccessYear(userId: string, year: string): Promise<boolean> {
    const membership = await this.getUserMembership(userId);

    if (!membership || membership.status !== 'active') {
      return false;
    }

    return membership.accessibleYears.includes(year);
  }

  /**
   * Cancel membership
   */
  async cancelMembership(userId: string): Promise<IMembership> {
    const membership = await this.getActiveMembership(userId);

    membership.status = 'cancelled';
    membership.cancellationDate = new Date();
    membership.autoRenew = false;

    const updated = await membership.save();
    logger.info(`Membership cancelled: ${userId}`);

    return updated;
  }

  /**
   * Suspend membership
   */
  async suspendMembership(userId: string): Promise<IMembership> {
    const membership = await this.getActiveMembership(userId);

    membership.status = 'suspended';
    const updated = await membership.save();

    logger.info(`Membership suspended: ${userId}`);

    return updated;
  }

  /**
   * Add accessible year
   */
  async addAccessibleYear(userId: string, year: string): Promise<IMembership> {
    const membership = await this.getActiveMembership(userId);

    if (!membership.accessibleYears.includes(year)) {
      membership.accessibleYears.push(year);
    }

    const updated = await membership.save();
    logger.info(`Year ${year} added to membership: ${userId}`);

    return updated;
  }
}

export const membershipService = new MembershipService();

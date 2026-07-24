import { Request, Response } from 'express';
import { membershipService } from '@/modules/memberships/services/membership.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { MembershipTier } from '@/modules/memberships/schemas/Membership.schema';
import logger from '@/core/logger/logger';
import { z } from 'zod';

const upgradeMembershipSchema = z.object({
  newTier: z.enum(['Pathway', 'Plus', 'Mentorship']),
});

const addYearSchema = z.object({
  year: z.string().regex(/^\d{4}$/),
});

export class MembershipController {
  /**
   * Get current membership
   * GET /api/v1/memberships/current
   */
  async getCurrentMembership(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const membership = await membershipService.getUserMembership(req.user.userId);

    if (!membership) {
      ResponseHandler.notFound(res, 'No active membership found');
      return;
    }

    ResponseHandler.ok(res, 'Membership retrieved', {
      id: membership._id,
      tier: membership.tier,
      status: membership.status,
      startDate: membership.startDate,
      renewalDate: membership.renewalDate,
      accessibleYears: membership.accessibleYears,
      autoRenew: membership.autoRenew,
    });
  }

  /**
   * Upgrade membership tier
   * POST /api/v1/memberships/upgrade
   */
  async upgradeMembership(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { newTier } = upgradeMembershipSchema.parse(req.body);

    const membership = await membershipService.upgradeMembership(req.user.userId, newTier);

    logger.info(`Membership upgraded: ${req.user.userId} - ${newTier}`);
    ResponseHandler.ok(res, 'Membership upgraded successfully', {
      tier: membership.tier,
      status: membership.status,
    });
  }

  /**
   * Cancel membership
   * POST /api/v1/memberships/cancel
   */
  async cancelMembership(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const membership = await membershipService.cancelMembership(req.user.userId);

    logger.info(`Membership cancelled: ${req.user.userId}`);
    ResponseHandler.ok(res, 'Membership cancelled', {
      status: membership.status,
      cancellationDate: membership.cancellationDate,
    });
  }

  /**
   * Add accessible year
   * POST /api/v1/memberships/add-year
   */
  async addAccessibleYear(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { year } = addYearSchema.parse(req.body);

    const membership = await membershipService.addAccessibleYear(req.user.userId, year);

    logger.info(`Year added to membership: ${year}`);
    ResponseHandler.ok(res, 'Year added to membership', {
      accessibleYears: membership.accessibleYears,
    });
  }
}

export const membershipController = new MembershipController();

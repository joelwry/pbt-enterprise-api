import { Request, Response } from 'express';
import { PowerTeamMember } from '@/modules/power-team/schemas/PowerTeam.schema';
import { subscriptionService } from '@/modules/subscriptions/services/subscription.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';
import { AuthorizationError } from '@/core/errors/AppError';

/** Power Team is restricted to Plus/Masterplan Programme members -- a Pathway member gets an honest 403 here (the frontend shows an upgrade/info page instead of ever calling these routes for real data). */
async function requirePlusOrHigher(userId: string): Promise<void> {
  const hasAccess = await subscriptionService.canAccessTier(userId, 'Plus');
  if (!hasAccess) {
    throw new AuthorizationError('Requires PBT Plus or PBT Masterplan Programme membership');
  }
}

export class PowerTeamController {
  /**
   * Get all power team members
   * GET /api/v1/power-team
   */
  async getPowerTeamMembers(req: Request, res: Response): Promise<void> {
    await requirePlusOrHigher(req.user!.userId);
    const { page = 1, limit = 20, category, region, search } = req.query;
    const query = PaginationHelper.parse({ page: page as string, limit: limit as string, search: search as string });

    const filter: any = { isActive: true };

    if (category && category !== 'All') filter.category = category;
    if (region) filter.region = region;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { region: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
      ];
    }

    const [members, total] = await Promise.all([
      PowerTeamMember.find(filter)
        .skip(query.skip)
        .limit(query.limit)
        .sort({ isVerified: -1, createdAt: -1 }),
      PowerTeamMember.countDocuments(filter),
    ]);

    const pagination = PaginationHelper.createMeta(query.page, query.limit, total);
    ResponseHandler.paginated(res, 200, 'Power team members retrieved', members, pagination);
  }

  /**
   * Get member by ID
   * GET /api/v1/power-team/:memberId
   */
  async getMemberById(req: Request, res: Response): Promise<void> {
    await requirePlusOrHigher(req.user!.userId);
    const { memberId } = req.params;

    const member = await PowerTeamMember.findOne({ _id: memberId, isActive: true });

    if (!member) {
      ResponseHandler.notFound(res, 'Member not found');
      return;
    }

    ResponseHandler.ok(res, 'Member retrieved', member);
  }

  /**
   * Get members by category
   * GET /api/v1/power-team/category/:category
   */
  async getMembersByCategory(req: Request, res: Response): Promise<void> {
    await requirePlusOrHigher(req.user!.userId);
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const query = PaginationHelper.parse({ page: page as string, limit: limit as string });

    const [members, total] = await Promise.all([
      PowerTeamMember.find({ category: category as any, isActive: true })
        .skip(query.skip)
        .limit(query.limit)
        .sort({ isVerified: -1, createdAt: -1 }),
      PowerTeamMember.countDocuments({ category: category as any, isActive: true }),
    ]);

    const pagination = PaginationHelper.createMeta(query.page, query.limit, total);
    ResponseHandler.paginated(res, 200, 'Members retrieved', members, pagination);
  }

  /**
   * Get available categories
   * GET /api/v1/power-team/categories/list
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    const categories = await PowerTeamMember.distinct('category', { isActive: true });

    ResponseHandler.ok(res, 'Categories retrieved', categories.sort());
  }

  /**
   * Get available regions
   * GET /api/v1/power-team/regions/list
   */
  async getRegions(req: Request, res: Response): Promise<void> {
    const regions = await PowerTeamMember.distinct('region', {
      isActive: true,
      region: { $ne: null },
    });

    ResponseHandler.ok(res, 'Regions retrieved', regions.sort());
  }

  /**
   * Get verified members
   * GET /api/v1/power-team/verified/list
   */
  async getVerifiedMembers(req: Request, res: Response): Promise<void> {
    await requirePlusOrHigher(req.user!.userId);
    const { page = 1, limit = 20 } = req.query;
    const query = PaginationHelper.parse({ page: page as string, limit: limit as string });

    const [members, total] = await Promise.all([
      PowerTeamMember.find({ isActive: true, isVerified: true })
        .skip(query.skip)
        .limit(query.limit)
        .sort({ createdAt: -1 }),
      PowerTeamMember.countDocuments({ isActive: true, isVerified: true }),
    ]);

    const pagination = PaginationHelper.createMeta(query.page, query.limit, total);
    ResponseHandler.paginated(res, 200, 'Verified members retrieved', members, pagination);
  }
}

export const powerTeamController = new PowerTeamController();

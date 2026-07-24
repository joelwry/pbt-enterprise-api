import { Request, Response } from 'express';
import { Leader } from '@/modules/leaders/schemas/Leader.schema';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';

export class LeadersController {
  /**
   * Get all leaders with pagination
   * GET /api/v1/leaders
   */
  async getLeaders(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 20, region, specialism, search } = req.query;
    const query = PaginationHelper.parse({ page: page as string, limit: limit as string, search: search as string });

    const filter: any = { isActive: true };

    if (region) filter.region = region;
    if (specialism) filter.specialism = { $in: [specialism] };

    if (search) {
      filter.$or = [
        { 'userId.fullName': { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
      ];
    }

    const leaders = await Leader.find(filter)
      .populate('userId', 'fullName email avatarUrl')
      .skip(query.skip)
      .limit(query.limit)
      .sort({ rating: -1, membersCount: -1 });

    const total = await Leader.countDocuments(filter);

    const pagination = PaginationHelper.createMeta(query.page, query.limit, total);
    ResponseHandler.paginated(res, 200, 'Leaders retrieved', leaders, pagination);
  }

  /**
   * Get leader by ID
   * GET /api/v1/leaders/:leaderId
   */
  async getLeaderById(req: Request, res: Response): Promise<void> {
    const { leaderId } = req.params;

    const leader = await Leader.findById(leaderId).populate('userId', 'fullName email avatarUrl');

    if (!leader) {
      ResponseHandler.notFound(res, 'Leader not found');
      return;
    }

    ResponseHandler.ok(res, 'Leader retrieved', leader);
  }

  /**
   * Get leaders by region
   * GET /api/v1/leaders/region/:region
   */
  async getLeadersByRegion(req: Request, res: Response): Promise<void> {
    const { region } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const query = PaginationHelper.parse({ page: page as string, limit: limit as string });

    const leaders = await Leader.find({ region, isActive: true })
      .populate('userId', 'fullName email avatarUrl')
      .skip(query.skip)
      .limit(query.limit)
      .sort({ rating: -1 });

    const total = await Leader.countDocuments({ region, isActive: true });

    const pagination = PaginationHelper.createMeta(query.page, query.limit, total);
    ResponseHandler.paginated(res, 200, 'Leaders retrieved', leaders, pagination);
  }

  /**
   * Get available regions
   * GET /api/v1/leaders/regions/list
   */
  async getRegions(req: Request, res: Response): Promise<void> {
    const regions = await Leader.distinct('region', { isActive: true });

    ResponseHandler.ok(res, 'Regions retrieved', regions.sort());
  }

  /**
   * Get top leaders
   * GET /api/v1/leaders/top
   */
  async getTopLeaders(req: Request, res: Response): Promise<void> {
    const { limit = 10 } = req.query;

    const leaders = await Leader.find({ isActive: true })
      .populate('userId', 'fullName email avatarUrl')
      .sort({ rating: -1, reviewCount: -1 })
      .limit(Number(limit));

    ResponseHandler.ok(res, 'Top leaders retrieved', leaders);
  }
}

export const leadersController = new LeadersController();

import { Request, Response } from 'express';
import { Leader, LeaderRegion } from '@/modules/leaders/schemas/Leader.schema';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';

export class LeadersController {
  /**
   * Get all leaders with pagination
   * GET /api/v1/leaders
   */
  async getLeaders(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 20, region, search } = req.query;
    const query = PaginationHelper.parse({ page: page as string, limit: limit as string, search: search as string });

    const filter: any = { isActive: true };
    if (region && region !== 'All') filter.region = region;

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { specialty: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const [leaders, total] = await Promise.all([
      Leader.find(filter)
        .skip(query.skip)
        .limit(query.limit)
        .sort({ rating: -1, membersCount: -1 }),
      Leader.countDocuments(filter),
    ]);

    const pagination = PaginationHelper.createMeta(query.page, query.limit, total);
    ResponseHandler.paginated(res, 200, 'Leaders retrieved', leaders, pagination);
  }

  /**
   * Get leader by ID
   * GET /api/v1/leaders/:leaderId
   */
  async getLeaderById(req: Request, res: Response): Promise<void> {
    const { leaderId } = req.params;

    const leader = await Leader.findOne({ _id: leaderId, isActive: true });

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
    const region = req.params.region as LeaderRegion;
    const { page = 1, limit = 20 } = req.query;
    const query = PaginationHelper.parse({ page: page as string, limit: limit as string });

    const [leaders, total] = await Promise.all([
      Leader.find({ region, isActive: true })
        .skip(query.skip)
        .limit(query.limit)
        .sort({ rating: -1 }),
      Leader.countDocuments({ region, isActive: true }),
    ]);

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
   * GET /api/v1/leaders/top/rated
   */
  async getTopLeaders(req: Request, res: Response): Promise<void> {
    const { limit = 10 } = req.query;

    const leaders = await Leader.find({ isActive: true })
      .sort({ rating: -1, reviewCount: -1 })
      .limit(Number(limit));

    ResponseHandler.ok(res, 'Top leaders retrieved', leaders);
  }
}

export const leadersController = new LeadersController();

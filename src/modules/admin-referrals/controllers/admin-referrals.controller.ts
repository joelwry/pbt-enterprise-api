import { Request, Response } from 'express';
import { adminReferralsService } from '@/modules/admin-referrals/services/admin-referrals.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';

export class AdminReferralsController {
  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await adminReferralsService.getStats();
    ResponseHandler.ok(res, 'Referral stats retrieved successfully', stats);
  }

  async getReferrals(req: Request, res: Response): Promise<void> {
    const { page, limit } = PaginationHelper.parse({ page: req.query.page as string, limit: req.query.limit as string });
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const { items, totalItems } = await adminReferralsService.getReferrals({ search, page, limit });
    ResponseHandler.paginated(res, 200, 'Referrals retrieved successfully', items, PaginationHelper.createMeta(page, limit, totalItems));
  }
}

export const adminReferralsController = new AdminReferralsController();

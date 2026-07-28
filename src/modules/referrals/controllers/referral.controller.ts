import { Request, Response } from 'express';
import { referralService } from '@/modules/referrals/services/referral.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';

export class ReferralController {
  async getSummary(req: Request, res: Response): Promise<void> {
    const summary = await referralService.getSummary(req.user!.userId);
    ResponseHandler.ok(res, 'Referral summary retrieved successfully', summary);
  }

  async getReferredMembers(req: Request, res: Response): Promise<void> {
    const { page, limit } = PaginationHelper.parse({ page: req.query.page as string, limit: req.query.limit as string });
    const { items, totalItems } = await referralService.getReferredMembers(req.user!.userId, page, limit);

    ResponseHandler.paginated(res, 200, 'Referred members retrieved successfully', items, PaginationHelper.createMeta(page, limit, totalItems));
  }
}

export const referralController = new ReferralController();

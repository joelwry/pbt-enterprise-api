import { Request, Response } from 'express';
import { adminReferralsService } from '@/modules/admin-referrals/services/admin-referrals.service';
import { markPaidSchema, referralIdParamSchema } from '@/modules/admin-referrals/validators/admin-referrals.validators';
import { REFERRAL_FILTER_BUCKETS, ReferralFilterKey } from '@/modules/referrals/services/referral-status';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';
import { AuthenticationError } from '@/core/errors/AppError';

export class AdminReferralsController {
  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await adminReferralsService.getStats();
    ResponseHandler.ok(res, 'Referral stats retrieved successfully', stats);
  }

  async getReferrals(req: Request, res: Response): Promise<void> {
    const { page, limit } = PaginationHelper.parse({ page: req.query.page as string, limit: req.query.limit as string });
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const filterParam = typeof req.query.filter === 'string' ? req.query.filter : undefined;
    const filter = filterParam && filterParam in REFERRAL_FILTER_BUCKETS ? (filterParam as ReferralFilterKey) : undefined;

    const { items, totalItems } = await adminReferralsService.getReferrals({ search, filter, page, limit });
    ResponseHandler.paginated(res, 200, 'Referrals retrieved successfully', items, PaginationHelper.createMeta(page, limit, totalItems));
  }

  async markPaymentPending(req: Request, res: Response): Promise<void> {
    const { referralId } = referralIdParamSchema.parse(req.params);
    const referral = await adminReferralsService.markPaymentPending(referralId);
    ResponseHandler.ok(res, 'Referral marked as payment processing', referral);
  }

  async markPaid(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthenticationError('Admin not authenticated');
    const { referralId } = referralIdParamSchema.parse(req.params);
    const input = markPaidSchema.parse(req.body ?? {});

    const referral = await adminReferralsService.markPaid(referralId, req.user.userId, input);
    ResponseHandler.ok(res, 'Referral marked as paid', referral);
  }
}

export const adminReferralsController = new AdminReferralsController();

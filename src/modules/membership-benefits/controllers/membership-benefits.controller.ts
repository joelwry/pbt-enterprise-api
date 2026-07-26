import { Request, Response } from 'express';
import { membershipBenefitsService } from '@/modules/membership-benefits/services/membership-benefits.service';
import { subscriptionService } from '@/modules/subscriptions/services/subscription.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';
import { AuthorizationError, ValidationError } from '@/core/errors/AppError';

async function requireMentorshipTier(userId: string): Promise<void> {
  const hasAccess = await subscriptionService.canAccessTier(userId, 'Mentorship');
  if (!hasAccess) {
    throw new AuthorizationError('Requires PBT Mentorship membership or higher');
  }
}

export class MembershipBenefitsController {
  async getMentorshipPage(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    await requireMentorshipTier(userId);

    const page = await membershipBenefitsService.getMentorshipPage(userId);
    ResponseHandler.ok(res, 'PBT Mentorship page retrieved successfully', page);
  }

  async getCalls(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    await requireMentorshipTier(userId);

    const { page, limit } = PaginationHelper.parse({ page: req.query.page as string, limit: req.query.limit as string });
    const { items, totalItems } = await membershipBenefitsService.getCalls(userId, page, limit);

    ResponseHandler.paginated(res, 200, 'Mentorship calls retrieved successfully', items, PaginationHelper.createMeta(page, limit, totalItems));
  }

  async bookCall(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    await requireMentorshipTier(userId);

    const { topic, scheduledAt } = req.body as { topic?: string; scheduledAt?: string };
    if (!topic || !scheduledAt) {
      throw new ValidationError('topic and scheduledAt are required');
    }

    const call = await membershipBenefitsService.bookCall(userId, { topic, scheduledAt: new Date(scheduledAt) });
    ResponseHandler.created(res, 'Call booked successfully', call);
  }
}

export const membershipBenefitsController = new MembershipBenefitsController();

import { Request, Response } from 'express';
import { adminSubscriptionsService } from '@/modules/admin-subscriptions/services/admin-subscriptions.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';

export class AdminSubscriptionsController {
  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await adminSubscriptionsService.getStats();
    ResponseHandler.ok(res, 'Subscription stats retrieved successfully', stats);
  }

  async getRevenueByTier(req: Request, res: Response): Promise<void> {
    const revenue = await adminSubscriptionsService.getRevenueByTier();
    ResponseHandler.ok(res, 'Revenue by tier retrieved successfully', revenue);
  }

  async getInvoices(req: Request, res: Response): Promise<void> {
    const { page, limit } = PaginationHelper.parse({ page: req.query.page as string, limit: req.query.limit as string });
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const { items, totalItems } = await adminSubscriptionsService.getInvoices({ status, search, page, limit });

    ResponseHandler.paginated(res, 200, 'Invoices retrieved successfully', items, PaginationHelper.createMeta(page, limit, totalItems));
  }

  async getMentorshipMembers(req: Request, res: Response): Promise<void> {
    const { page, limit } = PaginationHelper.parse({ page: req.query.page as string, limit: req.query.limit as string });
    const { items, totalItems } = await adminSubscriptionsService.getMentorshipMembers(page, limit);

    ResponseHandler.paginated(res, 200, 'Mentorship members retrieved successfully', items, PaginationHelper.createMeta(page, limit, totalItems));
  }

  async assignMentor(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const { leaderId } = req.body as { leaderId: string | null };

    const result = await adminSubscriptionsService.assignMentor(userId, leaderId || null);
    ResponseHandler.ok(res, leaderId ? 'Mentor assigned successfully' : 'Mentor unassigned successfully', result);
  }
}

export const adminSubscriptionsController = new AdminSubscriptionsController();

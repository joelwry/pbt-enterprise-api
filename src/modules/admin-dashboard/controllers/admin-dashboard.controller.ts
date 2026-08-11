import { Request, Response } from 'express';
import { adminDashboardService } from '@/modules/admin-dashboard/services/admin-dashboard.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { AuthenticationError } from '@/core/errors/AppError';

export class AdminDashboardController {
  async getDashboard(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthenticationError('Admin not authenticated');
    const dashboard = await adminDashboardService.getDashboard(req.user.userId);
    ResponseHandler.ok(res, 'Admin dashboard data retrieved successfully', dashboard);
  }
}

export const adminDashboardController = new AdminDashboardController();

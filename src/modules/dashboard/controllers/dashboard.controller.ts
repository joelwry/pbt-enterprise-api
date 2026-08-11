import { Request, Response } from 'express';
import dashboardService from '../services/dashboard.service';
import { ResponseHandler } from '../../../core/response/ResponseHandler';

export class DashboardController {
  async getDashboard(req: Request, res: Response) {
    const dashboard = await dashboardService.buildDashboard(req.user!.userId);
    ResponseHandler.ok(res, 'Dashboard built', dashboard);
  }

  async getDashboardSummary(req: Request, res: Response) {
    const summary = await dashboardService.getSummary(req.user!.userId);
    ResponseHandler.ok(res, 'Dashboard summary retrieved', summary);
  }
}

export default new DashboardController();

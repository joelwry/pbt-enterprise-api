import { Request, Response } from 'express';
import dashboardService from '../services/dashboard.service';
import { ResponseHandler } from '../../../core/response/ResponseHandler';

export class DashboardController {
  async getDashboard(req: Request, res: Response) {
    const dashboard = await dashboardService.buildDashboard(req.user!.id);
    ResponseHandler.success(res, dashboard, 'Dashboard built');
  }

  async getDashboardSummary(req: Request, res: Response) {
    const summary = await dashboardService.getSummary(req.user!.id);
    ResponseHandler.success(res, summary, 'Dashboard summary retrieved');
  }
}

export default new DashboardController();

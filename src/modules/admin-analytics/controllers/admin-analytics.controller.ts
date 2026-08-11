import { Request, Response } from 'express';
import { adminAnalyticsService } from '@/modules/admin-analytics/services/admin-analytics.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';

export class AdminAnalyticsController {
  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await adminAnalyticsService.getStats();
    ResponseHandler.ok(res, 'Analytics stats retrieved successfully', stats);
  }

  async getMemberGrowth(req: Request, res: Response): Promise<void> {
    const growth = await adminAnalyticsService.getMemberGrowth();
    ResponseHandler.ok(res, 'Member growth retrieved successfully', growth);
  }

  async getMembersByTier(req: Request, res: Response): Promise<void> {
    const breakdown = await adminAnalyticsService.getMembersByTier();
    ResponseHandler.ok(res, 'Members by tier retrieved successfully', breakdown);
  }

  async getContentEngagement(req: Request, res: Response): Promise<void> {
    const engagement = await adminAnalyticsService.getContentEngagement();
    ResponseHandler.ok(res, 'Content engagement retrieved successfully', engagement);
  }

  async getEventAttendance(req: Request, res: Response): Promise<void> {
    const attendance = await adminAnalyticsService.getEventAttendance();
    ResponseHandler.ok(res, 'Event attendance retrieved successfully', attendance);
  }
}

export const adminAnalyticsController = new AdminAnalyticsController();

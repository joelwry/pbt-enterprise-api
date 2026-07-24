import { Request, Response } from 'express';
import activityService from '../services/activity.service';
import { ResponseHandler } from '../../../core/response/ResponseHandler';

export class ActivityController {
  async getActivityFeed(req: Request, res: Response) {
    const limit = parseInt(req.query.limit as string) || 50;
    const feed = await activityService.getActivityFeed(req.user!.id, limit);
    ResponseHandler.success(res, feed, 'Activity feed retrieved');
  }

  async getPublicFeed(req: Request, res: Response) {
    const limit = parseInt(req.query.limit as string) || 100;
    const feed = await activityService.getPublicFeed(limit);
    ResponseHandler.success(res, feed, 'Public feed retrieved');
  }
}

export default new ActivityController();

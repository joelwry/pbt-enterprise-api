import { Request, Response } from 'express';
import insightService from '../services/insight.service';
import { ResponseHandler } from '../../../core/response/ResponseHandler';

export class InsightController {
  async getTrendingInsights(req: Request, res: Response) {
    const limit = parseInt(req.query.limit as string) || 10;
    const insights = await insightService.getTrendingInsights(limit);
    ResponseHandler.success(res, insights, 'Trending insights retrieved');
  }

  async getByCategory(req: Request, res: Response) {
    const { category } = req.params;
    const insights = await insightService.getByCategory(category);
    ResponseHandler.success(res, insights, 'Insights retrieved');
  }
}

export default new InsightController();

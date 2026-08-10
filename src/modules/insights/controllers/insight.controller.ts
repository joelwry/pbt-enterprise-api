import { Request, Response } from 'express';
import insightService from '../services/insight.service';
import { ResponseHandler } from '../../../core/response/ResponseHandler';

export class InsightController {
  async getTrendingInsights(req: Request, res: Response) {
    const limit = parseInt(req.query.limit as string) || 10;
    const insights = await insightService.getTrendingInsights(limit);
    ResponseHandler.ok(res, 'Trending insights retrieved', insights);
  }

  async getByCategory(req: Request, res: Response) {
    const { category } = req.params;
    const insights = await insightService.getByCategory(category);
    ResponseHandler.ok(res, 'Insights retrieved', insights);
  }
}

export default new InsightController();

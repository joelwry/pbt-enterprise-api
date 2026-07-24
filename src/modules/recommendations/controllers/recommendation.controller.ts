import { Request, Response } from 'express';
import recommendationService from '../services/recommendation.service';
import { ResponseHandler } from '../../../core/response/ResponseHandler';

export class RecommendationController {
  async getProgrammeRecommendations(req: Request, res: Response) {
    const recs = await recommendationService.generateRecommendations(req.user!.userId, 'programme');
    ResponseHandler.ok(res, 'Recommendations retrieved', recs);
  }

  async getEventRecommendations(req: Request, res: Response) {
    const recs = await recommendationService.generateRecommendations(req.user!.userId, 'event');
    ResponseHandler.ok(res, 'Recommendations retrieved', recs);
  }

  async markEngaged(req: Request, res: Response) {
    const { recommendationId } = req.params;
    const rec = await recommendationService.markEngaged(recommendationId);
    ResponseHandler.ok(res, 'Recommendation marked as engaged', rec);
  }
}

export default new RecommendationController();

import { Request, Response } from 'express';
import recommendationService from '../services/recommendation.service';
import { ResponseHandler } from '../../../core/response/ResponseHandler';

export class RecommendationController {
  async getProgrammeRecommendations(req: Request, res: Response) {
    const recs = await recommendationService.generateRecommendations(req.user!.id, 'programme');
    ResponseHandler.success(res, recs, 'Recommendations retrieved');
  }

  async getEventRecommendations(req: Request, res: Response) {
    const recs = await recommendationService.generateRecommendations(req.user!.id, 'event');
    ResponseHandler.success(res, recs, 'Recommendations retrieved');
  }

  async markEngaged(req: Request, res: Response) {
    const { recommendationId } = req.params;
    const rec = await recommendationService.markEngaged(recommendationId);
    ResponseHandler.success(res, rec, 'Recommendation marked as engaged');
  }
}

export default new RecommendationController();

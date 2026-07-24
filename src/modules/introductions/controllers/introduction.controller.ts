import { Request, Response } from 'express';
import introductionService from '../services/introduction.service';
import { ResponseHandler } from '../../../core/response/ResponseHandler';

export class IntroductionController {
  async sendIntroduction(req: Request, res: Response) {
    const { toMemberId, message } = req.body;
    const introduction = await introductionService.sendIntroduction(req.user!.id, toMemberId, message);
    ResponseHandler.success(res, introduction, 'Introduction sent successfully', 201);
  }

  async getReceivedIntroductions(req: Request, res: Response) {
    const introductions = await introductionService.getReceivedIntroduction(req.user!.id);
    ResponseHandler.success(res, introductions, 'Introductions retrieved');
  }

  async acceptIntroduction(req: Request, res: Response) {
    const { introductionId } = req.params;
    const introduction = await introductionService.acceptIntroduction(introductionId, req.user!.id);
    ResponseHandler.success(res, introduction, 'Introduction accepted');
  }

  async getConnections(req: Request, res: Response) {
    const connections = await introductionService.getConnections(req.user!.id);
    ResponseHandler.success(res, connections, 'Connections retrieved');
  }
}

export default new IntroductionController();

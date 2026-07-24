import { Request, Response } from 'express';
import introductionService from '../services/introduction.service';
import { ResponseHandler } from '../../../core/response/ResponseHandler';

export class IntroductionController {
  async sendIntroduction(req: Request, res: Response) {
    const { toMemberId, message } = req.body;
    const introduction = await introductionService.sendIntroduction(req.user!.userId, toMemberId, message);
    ResponseHandler.created(res, 'Introduction sent successfully', introduction);
  }

  async getReceivedIntroductions(req: Request, res: Response) {
    const introductions = await introductionService.getReceivedIntroduction(req.user!.userId);
    ResponseHandler.ok(res, 'Introductions retrieved', introductions);
  }

  async acceptIntroduction(req: Request, res: Response) {
    const { introductionId } = req.params;
    const introduction = await introductionService.acceptIntroduction(introductionId, req.user!.userId);
    ResponseHandler.ok(res, 'Introduction accepted', introduction);
  }

  async getConnections(req: Request, res: Response) {
    const connections = await introductionService.getConnections(req.user!.userId);
    ResponseHandler.ok(res, 'Connections retrieved', connections);
  }
}

export default new IntroductionController();

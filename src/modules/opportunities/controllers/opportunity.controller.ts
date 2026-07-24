import { Request, Response } from 'express';
import opportunityService from '../services/opportunity.service';
import { ResponseHandler } from '../../../core/response/ResponseHandler';

export class OpportunityController {
  async getPendingOpportunities(req: Request, res: Response) {
    const opps = await opportunityService.getPendingOpportunities(req.user!.id);
    ResponseHandler.success(res, opps, 'Opportunities retrieved');
  }

  async respondToOpportunity(req: Request, res: Response) {
    const { opportunityId } = req.params;
    const { status } = req.body;
    const opp = await opportunityService.respondToOpportunity(opportunityId, status);
    ResponseHandler.success(res, opp, 'Opportunity response recorded');
  }
}

export default new OpportunityController();

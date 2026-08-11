import { Request, Response } from 'express';
import opportunityService from '../services/opportunity.service';
import { ResponseHandler } from '../../../core/response/ResponseHandler';

export class OpportunityController {
  async getPendingOpportunities(req: Request, res: Response) {
    const opps = await opportunityService.getPendingOpportunities(req.user!.userId);
    ResponseHandler.ok(res, 'Opportunities retrieved', opps);
  }

  async respondToOpportunity(req: Request, res: Response) {
    const { opportunityId } = req.params;
    const { status } = req.body;
    const opp = await opportunityService.respondToOpportunity(opportunityId, status);
    ResponseHandler.ok(res, 'Opportunity response recorded', opp);
  }
}

export default new OpportunityController();

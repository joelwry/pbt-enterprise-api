import { Opportunity } from '../schemas/Opportunity.schema';

export class OpportunityService {
  async createOpportunity(memberId: string, data: any) {
    const opportunity = new Opportunity({
      memberId,
      ...data,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    });
    return opportunity.save();
  }

  async getPendingOpportunities(memberId: string) {
    return Opportunity.find({ memberId, status: 'pending', expiresAt: { $gt: new Date() } })
      .sort({ relevanceScore: -1 });
  }

  async respondToOpportunity(opportunityId: string, status: 'accepted' | 'declined') {
    return Opportunity.findByIdAndUpdate(
      opportunityId,
      { status, responded: true },
      { new: true }
    );
  }
}

export default new OpportunityService();

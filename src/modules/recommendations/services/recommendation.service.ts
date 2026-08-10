import { Recommendation } from '../schemas/Recommendation.schema';

export class RecommendationService {
  async generateRecommendations(memberId: string, itemType: string) {
    // This would be replaced with actual ML/scoring logic
    return Recommendation.find({ memberId, itemType: itemType as any, engaged: false })
      .sort({ relevanceScore: -1 })
      .limit(10);
  }

  async createRecommendation(memberId: string, itemId: string, itemType: string, reason: string, score: number) {
    const rec = new Recommendation({
      memberId,
      itemId,
      itemType,
      reason,
      relevanceScore: score,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    return rec.save();
  }

  async markEngaged(recommendationId: string) {
    return Recommendation.findByIdAndUpdate(recommendationId, { engaged: true }, { new: true });
  }
}

export default new RecommendationService();

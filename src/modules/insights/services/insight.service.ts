import { IndustryInsight } from '../schemas/IndustryInsight.schema';

export class InsightService {
  async createInsight(data: any) {
    const insight = new IndustryInsight(data);
    return insight.save();
  }

  async getTrendingInsights(limit: number = 10) {
    return IndustryInsight.find({ featured: true })
      .sort({ views: -1 })
      .limit(limit);
  }

  async getByCategory(category: string, limit: number = 20) {
    return IndustryInsight.find({ category })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async incrementViews(insightId: string) {
    return IndustryInsight.findByIdAndUpdate(insightId, { $inc: { views: 1 } }, { new: true });
  }
}

export default new InsightService();

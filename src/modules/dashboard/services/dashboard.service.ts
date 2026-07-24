import { DashboardData } from '../schemas/DashboardData.schema';

export class DashboardService {
  async buildDashboard(memberId: string) {
    let dashboard = await DashboardData.findOne({ memberId });
    if (!dashboard) {
      dashboard = new DashboardData({ memberId });
      await dashboard.save();
    }
    dashboard.lastUpdated = new Date();
    return dashboard.populate([
      'continuJourney.journeyId',
      'upcomingEvents',
      'recommendedResources',
      'industryInsights',
      'teamUpdates',
      'suggestedConnections',
    ]).save();
  }

  async getSummary(memberId: string) {
    return DashboardData.findOne({ memberId }).select(
      'continuJourney upcomingEvents recommendedResources notifications'
    );
  }
}

export default new DashboardService();

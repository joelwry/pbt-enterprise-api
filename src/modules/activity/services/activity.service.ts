import { Activity } from '../schemas/Activity.schema';

export class ActivityService {
  async logActivity(memberId: string, activityType: string, data: any) {
    const activity = new Activity({
      memberId,
      activityType,
      itemId: data.itemId,
      itemType: data.itemType,
      description: data.description,
      metadata: data.metadata,
    });
    return activity.save();
  }

  async getActivityFeed(memberId: string, limit: number = 50) {
    return Activity.find({ memberId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('memberId', 'name avatar');
  }

  async getPublicFeed(limit: number = 100) {
    return Activity.find({ visibility: { $in: ['public', 'members-only'] } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('memberId', 'name avatar');
  }
}

export default new ActivityService();

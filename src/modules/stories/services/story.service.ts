import { SuccessStory } from '../schemas/SuccessStory.schema';

export class SuccessStoryService {
  async createStory(data: any) {
    const story = new SuccessStory(data);
    return story.save();
  }

  async getPublishedStories(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const stories = await SuccessStory.find({ status: 'published' })
      .populate('memberId', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await SuccessStory.countDocuments({ status: 'published' });
    return { stories, total, pages: Math.ceil(total / limit) };
  }

  async likeStory(storyId: string, memberId: string) {
    return SuccessStory.findByIdAndUpdate(
      storyId,
      { $inc: { likes: 1 }, $addToSet: { likedBy: memberId } },
      { new: true }
    );
  }

  async incrementViews(storyId: string) {
    return SuccessStory.findByIdAndUpdate(storyId, { $inc: { views: 1 } }, { new: true });
  }
}

export default new SuccessStoryService();

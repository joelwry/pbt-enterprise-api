import { Request, Response } from 'express';
import storyService from '../services/story.service';
import { ResponseHandler } from '../../../core/response/ResponseHandler';

export class StoryController {
  async createStory(req: Request, res: Response) {
    const story = await storyService.createStory({ ...req.body, memberId: req.user!.userId });
    ResponseHandler.created(res, 'Story created', story);
  }

  async getPublishedStories(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const result = await storyService.getPublishedStories(page);
    ResponseHandler.ok(res, 'Stories retrieved', result.stories);
  }

  async likeStory(req: Request, res: Response) {
    const { storyId } = req.params;
    const story = await storyService.likeStory(storyId, req.user!.userId);
    ResponseHandler.ok(res, 'Story liked', story);
  }
}

export default new StoryController();

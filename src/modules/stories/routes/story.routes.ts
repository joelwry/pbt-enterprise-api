import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authMiddleware';
import storyController from '../controllers/story.controller';

const router = Router();

router.get('/', storyController.getPublishedStories.bind(storyController));
router.post('/', authenticate, storyController.createStory.bind(storyController));
router.post('/:storyId/like', authenticate, storyController.likeStory.bind(storyController));

export default router;

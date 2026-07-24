import { Router } from 'express';
import { authMiddleware } from '../../../core/middleware/authMiddleware';
import storyController from '../controllers/story.controller';

const router = Router();

router.get('/', storyController.getPublishedStories.bind(storyController));
router.post('/', authMiddleware, storyController.createStory.bind(storyController));
router.post('/:storyId/like', authMiddleware, storyController.likeStory.bind(storyController));

export default router;

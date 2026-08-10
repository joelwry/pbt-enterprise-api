import { Router } from 'express';
import { CommunityController } from '@/modules/community/controllers/community.controller';
import { authenticate } from '@/core/middleware/authMiddleware';

const router = Router();

/**
 * Community Routes
 * All routes require authentication
 */
router.use(authenticate);

// Specific routes before the /:threadId catch-all.
router.get('/categories', CommunityController.getCategories);
router.get('/meta', CommunityController.getMeta);

router.get('/', CommunityController.getThreads);
router.post('/', CommunityController.createThread);

router.get('/:threadId', CommunityController.getThreadDetail);
router.post('/:threadId/replies', CommunityController.addReply);
router.post('/:threadId/like', CommunityController.toggleLike);
router.post('/:threadId/report', CommunityController.reportThread);

export default router;

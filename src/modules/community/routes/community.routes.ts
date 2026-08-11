import { Router } from 'express';
import { CommunityController } from '@/modules/community/controllers/community.controller';
import { authenticate  } from '@/core/middleware/authMiddleware';

const router = Router();

/**
 * Community Routes
 * All routes require authentication
 */

// Get categories (public)
router.get('/categories', CommunityController.getCategories);

// Get all threads with pagination
router.get('/', CommunityController.getThreads);

// Get thread details with replies (protected)
router.get('/:threadId', authenticate, CommunityController.getThreadDetail);

// Create new thread (protected)
router.post('/', authenticate, CommunityController.createThread);

// Add reply to thread (protected)
router.post('/:threadId/replies', authenticate, CommunityController.addReply);

// Toggle like on thread (protected)
router.post('/:threadId/like', authenticate, CommunityController.toggleLike);

export default router;

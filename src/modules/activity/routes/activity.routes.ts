import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authMiddleware';
import activityController from '../controllers/activity.controller';

const router = Router();

router.get('/public', activityController.getPublicFeed.bind(activityController));
router.get('/', authenticate, activityController.getActivityFeed.bind(activityController));

export default router;

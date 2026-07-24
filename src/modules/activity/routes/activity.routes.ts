import { Router } from 'express';
import { authMiddleware } from '../../../core/middleware/authMiddleware';
import activityController from '../controllers/activity.controller';

const router = Router();

router.get('/public', activityController.getPublicFeed.bind(activityController));
router.get('/', authMiddleware, activityController.getActivityFeed.bind(activityController));

export default router;

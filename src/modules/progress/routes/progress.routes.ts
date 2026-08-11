import { Router } from 'express';
import { authenticate } from '@/core/middleware/authMiddleware';
import ProgressController from '../controllers/progress.controller';

const router = Router();

router.use(authenticate);

// Aggregate member progress projection (one per member — see UserProgress.schema.ts)
router.get('/', ProgressController.getProgress);
router.get('/stats', ProgressController.getStats);

router.get('/:roadmapId/milestones', ProgressController.getMilestones);
router.get('/:roadmapId/milestones/unlocked', ProgressController.getUnlockedMilestones);
router.get('/:roadmapId/rewards', ProgressController.getRewards);

export default router;

import { Router } from 'express';
import { protect } from '@/core/middleware/authMiddleware';
import ProgressController from '../controllers/progress.controller';

const router = Router();

router.use(protect);

router.get('/:programmeId', ProgressController.getProgress);
router.patch('/:programmeId/lessons/:lessonId', ProgressController.updateLessonProgress);
router.post('/:programmeId/lessons/:lessonId/complete', ProgressController.markLessonComplete);
router.get('/:programmeId/continue', ProgressController.getContinueWhere);
router.post('/:programmeId/notes/:contentId', ProgressController.addNote);
router.get('/stats/user', ProgressController.getStats);

router.get('/:programmeId/milestones', ProgressController.getMilestones);
router.get('/:programmeId/milestones/unlocked', ProgressController.getUnlockedMilestones);
router.get('/:programmeId/rewards', ProgressController.getRewards);

export default router;

import { Router } from 'express';
import { authMiddleware } from '../../../core/middleware/authMiddleware';
import mentorController from '../controllers/mentor.controller';

const router = Router();

router.get('/', mentorController.getMentors.bind(mentorController));
router.get('/:mentorId', mentorController.getMentorById.bind(mentorController));
router.post('/:mentorId/sessions', authMiddleware, mentorController.bookSession.bind(mentorController));
router.get('/sessions/history', authMiddleware, mentorController.getSessionHistory.bind(mentorController));

export default router;

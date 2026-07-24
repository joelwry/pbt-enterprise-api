import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authMiddleware';
import questionController from '../controllers/question.controller';

const router = Router();

router.get('/', questionController.getOpenQuestions.bind(questionController));
router.post('/', authenticate, questionController.createQuestion.bind(questionController));
router.post('/:questionId/answers', authenticate, questionController.answerQuestion.bind(questionController));

export default router;

import { Router } from 'express';
import { authMiddleware } from '../../../core/middleware/authMiddleware';
import questionController from '../controllers/question.controller';

const router = Router();

router.get('/', questionController.getOpenQuestions.bind(questionController));
router.post('/', authMiddleware, questionController.createQuestion.bind(questionController));
router.post('/:questionId/answers', authMiddleware, questionController.answerQuestion.bind(questionController));

export default router;

import { Router } from 'express';
import { authMiddleware } from '../../../core/middleware/authMiddleware';
import recommendationController from '../controllers/recommendation.controller';

const router = Router();

router.use(authMiddleware);

router.get('/programmes', recommendationController.getProgrammeRecommendations.bind(recommendationController));
router.get('/events', recommendationController.getEventRecommendations.bind(recommendationController));
router.patch('/:recommendationId/engage', recommendationController.markEngaged.bind(recommendationController));

export default router;

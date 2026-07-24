import { Router } from 'express';
import insightController from '../controllers/insight.controller';

const router = Router();

router.get('/trending', insightController.getTrendingInsights.bind(insightController));
router.get('/category/:category', insightController.getByCategory.bind(insightController));

export default router;

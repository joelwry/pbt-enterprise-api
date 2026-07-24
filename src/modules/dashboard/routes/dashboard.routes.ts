import { Router } from 'express';
import { authMiddleware } from '../../../core/middleware/authMiddleware';
import dashboardController from '../controllers/dashboard.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', dashboardController.getDashboard.bind(dashboardController));
router.get('/summary', dashboardController.getDashboardSummary.bind(dashboardController));

export default router;

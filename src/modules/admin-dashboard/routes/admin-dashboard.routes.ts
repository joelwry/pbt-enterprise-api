import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { adminDashboardController as c } from '@/modules/admin-dashboard/controllers/admin-dashboard.controller';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/', catchAsync((req, res) => c.getDashboard(req, res)));

export default router;

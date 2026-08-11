import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { adminAnalyticsController as c } from '@/modules/admin-analytics/controllers/admin-analytics.controller';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/stats', catchAsync((req, res) => c.getStats(req, res)));
router.get('/member-growth', catchAsync((req, res) => c.getMemberGrowth(req, res)));
router.get('/members-by-tier', catchAsync((req, res) => c.getMembersByTier(req, res)));
router.get('/content-engagement', catchAsync((req, res) => c.getContentEngagement(req, res)));
router.get('/event-attendance', catchAsync((req, res) => c.getEventAttendance(req, res)));

export default router;

import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { adminSubscriptionsController as c } from '@/modules/admin-subscriptions/controllers/admin-subscriptions.controller';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/stats', catchAsync((req, res) => c.getStats(req, res)));
router.get('/revenue-by-tier', catchAsync((req, res) => c.getRevenueByTier(req, res)));
router.get('/invoices', catchAsync((req, res) => c.getInvoices(req, res)));
router.get('/mentorship-members', catchAsync((req, res) => c.getMentorshipMembers(req, res)));
router.patch('/members/:userId/assign-mentor', catchAsync((req, res) => c.assignMentor(req, res)));

export default router;

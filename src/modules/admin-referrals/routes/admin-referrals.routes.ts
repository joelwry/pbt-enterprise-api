import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { adminReferralsController as c } from '@/modules/admin-referrals/controllers/admin-referrals.controller';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/stats', catchAsync((req, res) => c.getStats(req, res)));
router.get('/', catchAsync((req, res) => c.getReferrals(req, res)));
router.patch('/:referralId/payment-pending', catchAsync((req, res) => c.markPaymentPending(req, res)));
router.patch('/:referralId/mark-paid', catchAsync((req, res) => c.markPaid(req, res)));

export default router;

import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { pricingController as c } from '@/modules/pricing/controllers/pricing.controller';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/', catchAsync((req, res) => c.adminListPricing(req, res)));
router.put('/:tier/:billingCycle', catchAsync((req, res) => c.adminSetPricing(req, res)));
router.post('/:tier/:billingCycle/reset', catchAsync((req, res) => c.adminResetPricing(req, res)));
router.get('/:tier/:billingCycle/history', catchAsync((req, res) => c.adminGetHistory(req, res)));

export default router;

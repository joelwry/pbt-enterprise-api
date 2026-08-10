import { Router } from 'express';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { pricingController as c } from '@/modules/pricing/controllers/pricing.controller';

const router = Router();

// Public -- pricing is shown pre-login on /join, /login, and needs no auth.
router.get('/', catchAsync((req, res) => c.getPublicPricing(req, res)));

export default router;

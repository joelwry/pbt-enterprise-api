import { Router } from 'express';
import { authenticate } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { referralController as c } from '@/modules/referrals/controllers/referral.controller';

const router = Router();

router.use(authenticate);

router.get('/me', catchAsync((req, res) => c.getSummary(req, res)));
router.get('/me/referred', catchAsync((req, res) => c.getReferredMembers(req, res)));

export default router;

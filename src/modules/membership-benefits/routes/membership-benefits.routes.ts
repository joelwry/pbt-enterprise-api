import { Router } from 'express';
import { authenticate } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { membershipBenefitsController as c } from '@/modules/membership-benefits/controllers/membership-benefits.controller';

const router = Router();

router.use(authenticate);

router.get('/mentorship', catchAsync((req, res) => c.getMentorshipPage(req, res)));
router.get('/mentorship/calls', catchAsync((req, res) => c.getCalls(req, res)));
router.post('/mentorship/calls', catchAsync((req, res) => c.bookCall(req, res)));

export default router;

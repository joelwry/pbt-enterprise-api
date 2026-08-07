import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { siteSettingsController as c } from '@/modules/site-settings/controllers/site-settings.controller';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'));

router.put('/', catchAsync((req, res) => c.adminUpdateSettings(req, res)));

export default router;

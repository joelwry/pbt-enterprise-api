import { Router } from 'express';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { siteSettingsController as c } from '@/modules/site-settings/controllers/site-settings.controller';

const router = Router();

router.get('/', catchAsync((req, res) => c.getPublicSettings(req, res)));

export default router;

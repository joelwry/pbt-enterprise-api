import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { siteSettingsController as c } from '@/modules/site-settings/controllers/site-settings.controller';

const router = Router();

// Site Settings changes site-wide member-facing copy and isn't offered as a
// delegable section anywhere in the Invite Admin User form -- restricted to
// super_admin only, matching that intent. Previously allowed any
// admin/super_admin, so a staff account with only e.g. "Members" checked
// could still change platform-wide terminology via a direct API call.
router.use(authenticate, authorize('super_admin'));

router.put('/', catchAsync((req, res) => c.adminUpdateSettings(req, res)));

export default router;

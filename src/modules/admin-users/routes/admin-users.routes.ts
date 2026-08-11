import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { adminUsersController as c } from '@/modules/admin-users/controllers/admin-users.controller';

const router = Router();

// Admin Users & Roles manages who gets into the admin portal at all, so it's
// restricted to super_admin only -- matches the frontend's own route guard
// (isAdminRouteAllowed treats /admin/admin-users as Super-Admin-only).
router.use(authenticate, authorize('super_admin'));

router.get('/stats', catchAsync((req, res) => c.getStats(req, res)));
router.get('/', catchAsync((req, res) => c.listAccounts(req, res)));
router.post('/', catchAsync((req, res) => c.createAccount(req, res)));
router.get('/:accountId', catchAsync((req, res) => c.getAccountById(req, res)));
router.patch('/:accountId', catchAsync((req, res) => c.updateAccount(req, res)));
router.delete('/:accountId', catchAsync((req, res) => c.deleteAccount(req, res)));

export default router;

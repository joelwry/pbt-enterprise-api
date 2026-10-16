import { Router } from 'express';
import { authController } from '@/modules/auth/controllers/auth.controller';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { authenticate } from '@/core/middleware/authMiddleware';

const router = Router();

/**
 * Authentication Routes
 */

// Public routes
router.post('/register', catchAsync((req, res, next) => authController.register(req, res)));
router.post('/login', catchAsync((req, res, next) => authController.login(req, res)));
router.post('/refresh-token', catchAsync((req, res, next) => authController.refreshToken(req, res)));
router.post('/verify-email', catchAsync((req, res, next) => authController.verifyEmail(req, res)));
router.post('/forgot-password', catchAsync((req, res, next) => authController.forgotPassword(req, res)));
router.post('/reset-password/validate', catchAsync((req, res, next) => authController.validateResetToken(req, res)));
router.post('/reset-password', catchAsync((req, res, next) => authController.resetPassword(req, res)));

// Admin portal routes -- same credentials/business logic as the member routes
// above, but issue a separately-named refresh cookie (adminRefreshToken) so
// an admin and a member session in the same browser don't clobber each
// other's persistent (rememberMe) login. See auth.controller.ts.
router.post('/admin/login', catchAsync((req, res, next) => authController.adminLogin(req, res)));
router.post('/admin/refresh-token', catchAsync((req, res, next) => authController.adminRefreshToken(req, res)));
router.post('/admin/logout', authenticate, catchAsync((req, res, next) => authController.adminLogout(req, res)));

// Protected routes
router.get('/me', authenticate, catchAsync((req, res, next) => authController.getCurrentUser(req, res)));
router.patch('/me', authenticate, catchAsync((req, res, next) => authController.updateProfile(req, res)));
router.patch(
  '/me/notifications',
  authenticate,
  catchAsync((req, res, next) => authController.updateNotificationPreference(req, res))
);
router.post(
  '/me/change-password',
  authenticate,
  catchAsync((req, res, next) => authController.changePassword(req, res))
);
router.post('/logout', authenticate, catchAsync((req, res, next) => authController.logout(req, res)));

export default router;

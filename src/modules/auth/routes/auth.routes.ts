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
router.post('/reset-password', catchAsync((req, res, next) => authController.resetPassword(req, res)));

// Protected routes
router.get('/me', authenticate, catchAsync((req, res, next) => authController.getCurrentUser(req, res)));
router.patch('/me', authenticate, catchAsync((req, res, next) => authController.updateProfile(req, res)));
router.patch(
  '/me/notifications',
  authenticate,
  catchAsync((req, res, next) => authController.updateNotificationPreference(req, res))
);
router.post('/logout', authenticate, catchAsync((req, res, next) => authController.logout(req, res)));

export default router;

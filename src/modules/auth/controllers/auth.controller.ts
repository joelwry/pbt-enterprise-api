import { Request, Response } from 'express';
import { authService } from '@/modules/auth/services/auth.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { AuthenticationError, AuthorizationError } from '@/core/errors/AppError';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  emailVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validateResetTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
  updateNotificationPreferenceSchema,
} from '@/modules/auth/validators/auth.validators';
import logger from '@/core/logger/logger';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

// In production the frontend (Next.js) and this API are deployed on separate
// domains (Vercel + Render/Railway is the common split) — that makes every
// refresh-token request cross-site. `sameSite: 'strict'` (and even 'lax')
// blocks the browser from ever attaching the cookie to a cross-site request,
// which meant every full page reload silently failed to restore the session
// and looked like the member/admin being logged out. `'none'` is the only
// SameSite value browsers honor cross-site, and it requires `secure: true`
// (HTTPS) to be accepted at all -- true in every real deployment of this app.
// Locally, frontend and backend share `localhost` (same-site), so 'lax' still
// works there without needing HTTPS.
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  /**
   * Register
   * POST /api/v1/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    const { email, password, fullName, phone, referralCode } = registerSchema.parse(req.body);

    const result = await authService.register(email, password, fullName, referralCode);

    logger.info(`User registered: ${email}`);
    ResponseHandler.created(res, 'Registration successful', result);
  }

  /**
   * Login
   * POST /api/v1/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    const { email, password, rememberMe } = loginSchema.parse(req.body);

    const result = await authService.login(email, password);

    // Set secure HTTP-only cookie if rememberMe is true
    if (rememberMe) {
      res.cookie('refreshToken', result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    }

    logger.info(`User logged in: ${email}`);
    ResponseHandler.ok(res, 'Login successful', result);
  }

  /**
   * Admin Login -- identical to login() but issues a separately-named
   * refresh cookie (adminRefreshToken) so an admin and a member logged in
   * persistently in the same browser don't clobber each other's session
   * (both portals previously shared one `refreshToken` cookie). Also
   * enforces the admin-role check server-side instead of leaving it to the
   * admin frontend's own (bypassable) check.
   * POST /api/v1/auth/admin/login
   */
  async adminLogin(req: Request, res: Response): Promise<void> {
    const { email, password, rememberMe } = loginSchema.parse(req.body);

    const result = await authService.login(email, password);
    if (!ADMIN_ROLES.has(result.user.role)) {
      throw new AuthorizationError('This account does not have admin access');
    }

    if (rememberMe) {
      res.cookie('adminRefreshToken', result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    }

    logger.info(`Admin logged in: ${email}`);
    ResponseHandler.ok(res, 'Login successful', result);
  }

  /**
   * Refresh Token
   * POST /api/v1/auth/refresh-token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken: bodyRefreshToken } = refreshTokenSchema.parse(req.body ?? {});
    const cookieRefreshToken = req.cookies?.refreshToken as string | undefined;
    const refreshToken = bodyRefreshToken ?? cookieRefreshToken;

    if (!refreshToken) {
      throw new AuthenticationError('No refresh token provided');
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    // Persistent (rememberMe) sessions authenticate via the cookie alone, so
    // rotate it to the newly issued refresh token to keep the session alive.
    if (!bodyRefreshToken && cookieRefreshToken) {
      res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    }

    ResponseHandler.ok(res, 'Token refreshed', tokens);
  }

  /**
   * Admin Refresh Token -- mirrors refreshToken() against the separate
   * adminRefreshToken cookie.
   * POST /api/v1/auth/admin/refresh-token
   */
  async adminRefreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken: bodyRefreshToken } = refreshTokenSchema.parse(req.body ?? {});
    const cookieRefreshToken = req.cookies?.adminRefreshToken as string | undefined;
    const refreshToken = bodyRefreshToken ?? cookieRefreshToken;

    if (!refreshToken) {
      throw new AuthenticationError('No refresh token provided');
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    if (!bodyRefreshToken && cookieRefreshToken) {
      res.cookie('adminRefreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    }

    ResponseHandler.ok(res, 'Token refreshed', tokens);
  }

  /**
   * Verify Email
   * POST /api/v1/auth/verify-email
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token } = emailVerificationSchema.parse(req.body);

    await authService.verifyEmail(token);

    logger.info('Email verified');
    ResponseHandler.ok(res, 'Email verified successfully', {});
  }

  /**
   * Forgot Password
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = forgotPasswordSchema.parse(req.body);

    const message = await authService.requestPasswordReset(email);

    ResponseHandler.ok(res, message, {});
  }

  /**
   * Reset Password
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    await authService.resetPassword(token, newPassword);

    logger.info('Password reset completed');
    ResponseHandler.ok(res, 'Password reset successful', {});
  }

  /**
   * Check a set-password / reset link without consuming it
   * POST /api/v1/auth/reset-password/validate
   *
   * Always answers 200 with `valid: true|false` (never 401) -- an expired
   * link is an expected outcome here, and a 401 would also trip the
   * frontend's session-refresh handling for no reason.
   */
  async validateResetToken(req: Request, res: Response): Promise<void> {
    const { token } = validateResetTokenSchema.parse(req.body);

    const result = await authService.validateResetToken(token);

    ResponseHandler.ok(res, result.valid ? 'Link is valid' : 'Link is invalid or has expired', result);
  }

  /**
   * Get Current User
   * GET /api/v1/auth/me
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const user = await authService.getCurrentUser(req.user.userId);

    ResponseHandler.ok(res, 'Current user retrieved', user);
  }

  /**
   * Update Profile
   * PATCH /api/v1/auth/me
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const updates = updateProfileSchema.parse(req.body);
    const profile = await authService.updateProfile(req.user.userId, updates);

    ResponseHandler.ok(res, 'Profile updated successfully', profile);
  }

  /**
   * Change Password -- member or admin, same User model. Requires the
   * correct current password.
   * POST /api/v1/auth/me/change-password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user.userId, currentPassword, newPassword);

    ResponseHandler.ok(res, 'Password updated successfully', {});
  }

  /**
   * Update Notification Preference
   * PATCH /api/v1/auth/me/notifications
   */
  async updateNotificationPreference(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { key, value } = updateNotificationPreferenceSchema.parse(req.body);
    const notificationPreferences = await authService.updateNotificationPreference(req.user.userId, key, value);

    ResponseHandler.ok(res, 'Preference updated successfully', notificationPreferences);
  }

  /**
   * Logout
   * POST /api/v1/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    // Clear refresh token cookie -- must repeat the same attributes used to
    // set it (path/sameSite/secure), or some browsers won't recognize it as
    // the same cookie and silently keep the old one alive.
    res.clearCookie('refreshToken', { httpOnly: true, secure: REFRESH_COOKIE_OPTIONS.secure, sameSite: REFRESH_COOKIE_OPTIONS.sameSite });

    logger.info('User logged out');
    ResponseHandler.ok(res, 'Logout successful', {});
  }

  /**
   * Admin Logout -- clears the separate adminRefreshToken cookie only, so
   * an admin logging out doesn't clear a member session's cookie (or
   * vice versa) in the same browser.
   * POST /api/v1/auth/admin/logout
   */
  async adminLogout(req: Request, res: Response): Promise<void> {
    res.clearCookie('adminRefreshToken', { httpOnly: true, secure: REFRESH_COOKIE_OPTIONS.secure, sameSite: REFRESH_COOKIE_OPTIONS.sameSite });

    logger.info('Admin logged out');
    ResponseHandler.ok(res, 'Logout successful', {});
  }
}

export const authController = new AuthController();

import { Request, Response } from 'express';
import { authService } from '@/modules/auth/services/auth.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  emailVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/modules/auth/validators/auth.validators';
import logger from '@/core/logger/logger';

export class AuthController {
  /**
   * Register
   * POST /api/v1/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    const { email, password, fullName, phone } = registerSchema.parse(req.body);

    const result = await authService.register(email, password, fullName);

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
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    logger.info(`User logged in: ${email}`);
    ResponseHandler.ok(res, 'Login successful', result);
  }

  /**
   * Refresh Token
   * POST /api/v1/auth/refresh-token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    const tokens = await authService.refreshAccessToken(refreshToken);

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
   * Logout
   * POST /api/v1/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    logger.info('User logged out');
    ResponseHandler.ok(res, 'Logout successful', {});
  }
}

export const authController = new AuthController();

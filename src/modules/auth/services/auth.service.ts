import { AuthRepository, authRepository as defaultAuthRepository } from '@/modules/auth/repositories/auth.repository';
import { JwtHelper } from '@/core/auth/JwtHelper';
import { EmailService } from '@/core/email/EmailService';
import { referralService } from '@/modules/referrals/services/referral.service';
import {
  ConflictError,
  AuthenticationError,
  NotFoundError,
} from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    clientId: string;
  };
  tokens: AuthTokens;
}

export class AuthService {
  constructor(private authRepository: AuthRepository = defaultAuthRepository) {}

  /**
   * Register new user
   */
  async register(email: string, password: string, fullName: string, referralCode?: string): Promise<LoginResponse> {
    // Check if user already exists
    const existingUser = await this.authRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('User already registered with this email');
    }

    // Create user
    const user = await this.authRepository.create({
      email,
      password,
      fullName,
      role: 'member',
      emailVerified: false,
    });

    logger.info(`User registered: ${user.email}`);

    await referralService.recordReferral(referralCode, user._id.toString());

    // Generate tokens
    const tokens = this.generateTokens(user._id.toString(), user.email, user.role);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        clientId: user._id.toString(), // Using userId as clientId
      },
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    await this.authRepository.updateLastLogin(user._id.toString());

    logger.info(`User logged in: ${user.email}`);

    // Generate tokens
    const tokens = this.generateTokens(user._id.toString(), user.email, user.role);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        clientId: user._id.toString(),
      },
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    const payload = JwtHelper.verifyRefreshToken(refreshToken);

    const user = await this.authRepository.findById(payload.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const newTokens = this.generateTokens(user._id.toString(), user.email, user.role);
    logger.debug(`Access token refreshed for user: ${user.email}`);

    return newTokens;
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    const user = await this.authRepository.findByEmailVerificationToken(token);
    if (!user) {
      throw new AuthenticationError('Invalid or expired verification token');
    }

    await this.authRepository.verifyEmail(user._id.toString());
    logger.info(`Email verified: ${user.email}`);
  }

  /**
   * Request password reset. Always returns the same generic message
   * regardless of whether the email exists -- the raw token must never
   * reach the HTTP response (it's the credential that resets the
   * password; anyone who can read it can take over the account with only
   * the target's email address, no mailbox access required). It only ever
   * goes into the emailed reset link -- never logged anywhere, including
   * at debug level: this codebase's log files are git-tracked, so a
   * "server logs aren't publicly reachable" assumption doesn't hold here.
   * The token is also stored hashed (see setPasswordResetToken), so there
   * is deliberately no way to recover it without a working email send.
   */
  async requestPasswordReset(email: string): Promise<string> {
    const GENERIC_MESSAGE = 'If an account exists for this email, a password reset link has been sent.';
    const user = await this.authRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return GENERIC_MESSAGE;
    }

    const resetToken = await this.authRepository.setPasswordResetToken(user._id.toString());
    logger.info(`Password reset requested for user: ${user.email}`);

    // Not awaited: an unreachable/slow SMTP server otherwise blocks this
    // unauthenticated endpoint's response for as long as the send takes
    // (up to the transporter's connection timeout) -- a cheap DoS lever
    // and a needless wait for the member either way, since the emailed
    // link is the only thing that changes, not this response.
    EmailService.sendPasswordResetEmail(user.email, resetToken).catch((error) => {
      logger.error(`Failed to send password reset email to ${user.email}`, error);
    });

    return GENERIC_MESSAGE;
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.authRepository.findByPasswordResetToken(token);
    if (!user) {
      throw new AuthenticationError('Invalid or expired password reset token');
    }

    user.password = newPassword;
    await user.save();

    await this.authRepository.clearPasswordResetToken(user._id.toString());
    logger.info(`Password reset completed for user: ${user.email}`);
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId: string) {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      location: user.location,
      investmentFocus: user.investmentFocus,
      assignedLeader: user.assignedLeader,
      notificationPreferences: user.notificationPreferences,
      role: user.role,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
    };
  }

  /**
   * Update the current member's editable profile details.
   */
  async updateProfile(
    userId: string,
    updates: { fullName: string; email: string; phone: string; location: string; investmentFocus: string }
  ) {
    const existing = await this.authRepository.findById(userId);
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    const emailChanged = updates.email.toLowerCase() !== existing.email;
    const updated = await this.authRepository.update(userId, {
      ...updates,
      email: updates.email.toLowerCase(),
      // Changing the email address means the new one hasn't been verified yet.
      ...(emailChanged ? { emailVerified: false } : {}),
    });

    logger.info(`Profile updated: ${updated.email}`);

    return {
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      location: updated.location,
      investmentFocus: updated.investmentFocus,
      assignedLeader: updated.assignedLeader,
    };
  }

  /**
   * Change the current user's password (member or admin -- same User model).
   * Requires the correct current password, same as login.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Your current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    logger.info(`Password changed: ${user.email}`);
  }

  /**
   * Update a single notification preference for the current member.
   */
  async updateNotificationPreference(
    userId: string,
    key: keyof import('@/modules/users/schemas/User.schema').INotificationPreferences,
    value: boolean
  ) {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.notificationPreferences[key] = value;
    await user.save();

    return user.notificationPreferences;
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(userId: string, email: string, role: string): AuthTokens {
    const payload = { userId, email, role };

    return {
      accessToken: JwtHelper.generateAccessToken(payload),
      refreshToken: JwtHelper.generateRefreshToken(payload),
    };
  }
}

// Import User model here to avoid circular imports
import { User } from '@/modules/users/schemas/User.schema';

export const authService = new AuthService();

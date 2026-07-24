import { AuthRepository, authRepository } from '@/modules/auth/repositories/auth.repository';
import { JwtHelper } from '@/core/auth/JwtHelper';
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
  constructor(private authRepository: AuthRepository = authRepository) {}

  /**
   * Register new user
   */
  async register(email: string, password: string, fullName: string): Promise<LoginResponse> {
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
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<string> {
    const user = await this.authRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return 'If user exists, password reset link has been sent';
    }

    const resetToken = await this.authRepository.setPasswordResetToken(user._id.toString());
    logger.info(`Password reset requested for user: ${user.email}`);

    // TODO: Send email with reset token
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    return resetToken;
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
      role: user.role,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
    };
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

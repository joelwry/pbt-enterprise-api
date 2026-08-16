import { User, IUser } from '@/modules/users/schemas/User.schema';
import { NotFoundError } from '@/core/errors/AppError';
import crypto from 'crypto';

export class AuthRepository {
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<IUser | null> {
    return User.findById(id);
  }

  /**
   * Create new user
   */
  async create(data: Partial<IUser>): Promise<IUser> {
    const user = new User({
      ...data,
      email: data.email?.toLowerCase(),
    });
    return user.save();
  }

  /**
   * Update user
   */
  async update(id: string, data: Partial<IUser>): Promise<IUser> {
    const user = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(userId: string): Promise<string> {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await User.findByIdAndUpdate(userId, {
      passwordResetToken: hashedToken,
      passwordResetExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    return resetToken;
  }

  /**
   * Get user by password reset token
   */
  async findByPasswordResetToken(token: string): Promise<IUser | null> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    return User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: Date.now() },
    });
  }

  /**
   * Clear password reset token
   */
  async clearPasswordResetToken(userId: string): Promise<void> {
    // Mongoose silently drops undefined-valued keys when building the
    // update document -- `{ passwordResetToken: undefined }` here was a
    // complete no-op, so a used reset token stayed valid (and replayable)
    // until its 1-hour expiry instead of being invalidated after first use.
    // $unset is the only way to actually remove the fields.
    await User.findByIdAndUpdate(userId, {
      $unset: { passwordResetToken: '', passwordResetExpiry: '' },
    });
  }

  /**
   * Set email verification token
   */
  async setEmailVerificationToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    await User.findByIdAndUpdate(userId, {
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    return token;
  }

  /**
   * Get user by email verification token
   */
  async findByEmailVerificationToken(token: string): Promise<IUser | null> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    return User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: { $gt: Date.now() },
    });
  }

  /**
   * Verify email
   */
  async verifyEmail(userId: string): Promise<void> {
    // Same undefined-vs-$unset issue as clearPasswordResetToken above --
    // fixed here too so a used verification token doesn't stay replayable.
    await User.findByIdAndUpdate(userId, {
      $set: { emailVerified: true },
      $unset: { emailVerificationToken: '', emailVerificationExpiry: '' },
    });
  }

  /**
   * Update last login
   */
  async updateLastLogin(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      lastLoginAt: new Date(),
    });
  }
}

export const authRepository = new AuthRepository();

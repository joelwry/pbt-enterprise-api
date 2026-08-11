import { Session, SessionDocument } from '@/modules/sessions/schemas/Session.schema';
import { AppError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';
import { Types } from 'mongoose';
import crypto from 'crypto';

export class SessionService {
  /**
   * Hash refresh token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create new session
   */
  async createSession(
    userId: string,
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
    deviceId?: string
  ): Promise<SessionDocument> {
    try {
      const refreshTokenHash = this.hashToken(refreshToken);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      const session = new Session({
        userId: new Types.ObjectId(userId),
        deviceId: deviceId ? new Types.ObjectId(deviceId) : undefined,
        refreshTokenHash,
        refreshTokenExpiresAt: new Date(expiresAt),
        ipAddress,
        userAgent,
        isActive: true,
        lastActivityAt: new Date(),
        expiresAt,
      });

      const saved = await session.save();
      logger.info('Session created', { userId, ipAddress });
      return saved;
    } catch (error) {
      logger.error('Failed to create session', { userId, error });
      throw new AppError(500, 'Failed to create session', ['ERR_5006']);
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(userId: string, refreshToken: string): Promise<SessionDocument> {
    try {
      const tokenHash = this.hashToken(refreshToken);

      const session = await Session.findOne({
        userId: new Types.ObjectId(userId),
        refreshTokenHash: tokenHash,
        isActive: true,
        refreshTokenExpiresAt: { $gt: new Date() },
      });

      if (!session) {
        throw new AppError(401, 'Invalid or expired refresh token', ['ERR_2011']);
      }

      // Update last activity
      session.lastActivityAt = new Date();
      await session.save();

      return session;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to verify refresh token', { userId, error });
      throw new AppError(500, 'Failed to verify refresh token', ['ERR_5007']);
    }
  }

  /**
   * Rotate refresh token (create new, invalidate old)
   */
  async rotateRefreshToken(
    userId: string,
    oldRefreshToken: string,
    newRefreshToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<SessionDocument> {
    try {
      // Verify old token exists
      await this.verifyRefreshToken(userId, oldRefreshToken);

      // Invalidate old session
      const oldTokenHash = this.hashToken(oldRefreshToken);
      await Session.updateOne(
        {
          userId: new Types.ObjectId(userId),
          refreshTokenHash: oldTokenHash,
        },
        { isActive: false }
      );

      // Create new session
      return await this.createSession(userId, newRefreshToken, ipAddress, userAgent);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to rotate refresh token', { userId, error });
      throw new AppError(500, 'Failed to rotate refresh token', ['ERR_5008']);
    }
  }

  /**
   * Get all active sessions for user
   */
  async getUserSessions(userId: string): Promise<SessionDocument[]> {
    try {
      return await Session.find({
        userId: new Types.ObjectId(userId),
        isActive: true,
      }).sort({ lastActivityAt: -1 });
    } catch (error) {
      logger.error('Failed to get user sessions', { userId, error });
      throw new AppError(500, 'Failed to retrieve sessions', ['ERR_5009']);
    }
  }

  /**
   * Terminate specific session
   */
  async terminateSession(userId: string, sessionId: string): Promise<void> {
    try {
      const result = await Session.updateOne(
        {
          _id: new Types.ObjectId(sessionId),
          userId: new Types.ObjectId(userId),
        },
        { isActive: false }
      );

      if (result.matchedCount === 0) {
        throw new AppError(404, 'Session not found', ['ERR_4010']);
      }

      logger.info('Session terminated', { userId, sessionId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to terminate session', { userId, sessionId, error });
      throw new AppError(500, 'Failed to terminate session', ['ERR_5010']);
    }
  }

  /**
   * Terminate all sessions for user (logout everywhere)
   */
  async terminateAllSessions(userId: string): Promise<number> {
    try {
      const result = await Session.updateMany(
        { userId: new Types.ObjectId(userId) },
        { isActive: false }
      );

      logger.info('All sessions terminated', { userId, count: result.modifiedCount });
      return result.modifiedCount;
    } catch (error) {
      logger.error('Failed to terminate all sessions', { userId, error });
      throw new AppError(500, 'Failed to terminate all sessions', ['ERR_5011']);
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      await Session.updateOne(
        { _id: new Types.ObjectId(sessionId) },
        { lastActivityAt: new Date() }
      );
    } catch (error) {
      logger.error('Failed to update session activity', { sessionId, error });
    }
  }

  /**
   * Clean expired sessions
   */
  async cleanExpiredSessions(): Promise<number> {
    try {
      const result = await Session.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      logger.info('Expired sessions cleaned', { count: result.deletedCount });
      return result.deletedCount;
    } catch (error) {
      logger.error('Failed to clean expired sessions', { error });
      return 0;
    }
  }
}

export const sessionService = new SessionService();

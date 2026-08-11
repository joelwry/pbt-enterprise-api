import { AuditLog, AuditLogDocument } from '@/modules/audit/schemas/AuditLog.schema';
import logger from '@/core/logger/logger';
import { Types } from 'mongoose';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';

export interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  correlationId?: string;
}

export class AuditService {
  /**
   * Log an action
   */
  async logAction(entry: AuditLogEntry): Promise<AuditLogDocument> {
    try {
      const auditLog = new AuditLog({
        userId: new Types.ObjectId(entry.userId),
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details || {},
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        status: entry.status,
        errorMessage: entry.errorMessage,
        correlationId: entry.correlationId,
        timestamp: new Date(),
      });

      return await auditLog.save();
    } catch (error) {
      logger.error('Failed to log audit action', { entry, error });
      // Don't throw - audit logging should not break the main flow
      return null as any;
    }
  }

  /**
   * Log authentication event
   */
  async logAuthEvent(
    userId: string,
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'PASSWORD_CHANGED' | 'PASSWORD_RESET',
    ipAddress: string,
    userAgent: string,
    status: 'success' | 'failure' = 'success',
    errorMessage?: string,
    correlationId?: string
  ): Promise<void> {
    await this.logAction({
      userId,
      action,
      resource: 'auth',
      ipAddress,
      userAgent,
      status,
      errorMessage,
      correlationId,
    });
  }

  /**
   * Log subscription event
   */
  async logSubscriptionEvent(
    userId: string,
    action: 'SUBSCRIPTION_UPGRADED' | 'SUBSCRIPTION_DOWNGRADED' | 'SUBSCRIPTION_CANCELLED',
    subscriptionId: string,
    details: Record<string, any>,
    ipAddress: string,
    userAgent: string,
    correlationId?: string
  ): Promise<void> {
    await this.logAction({
      userId,
      action,
      resource: 'subscription',
      resourceId: subscriptionId,
      details,
      ipAddress,
      userAgent,
      status: 'success',
      correlationId,
    });
  }

  /**
   * Log device event
   */
  async logDeviceEvent(
    userId: string,
    action: 'DEVICE_ADDED' | 'DEVICE_REMOVED' | 'DEVICE_TRUSTED' | 'DEVICE_BLOCKED',
    deviceId: string,
    details: Record<string, any>,
    ipAddress: string,
    userAgent: string,
    correlationId?: string
  ): Promise<void> {
    await this.logAction({
      userId,
      action,
      resource: 'device',
      resourceId: deviceId,
      details,
      ipAddress,
      userAgent,
      status: 'success',
      correlationId,
    });
  }

  /**
   * Log resource access
   */
  async logResourceAccess(
    userId: string,
    action: 'RESOURCE_ACCESSED' | 'RESOURCE_DOWNLOADED',
    resourceId: string,
    ipAddress: string,
    userAgent: string,
    correlationId?: string
  ): Promise<void> {
    await this.logAction({
      userId,
      action,
      resource: 'resource',
      resourceId,
      ipAddress,
      userAgent,
      status: 'success',
      correlationId,
    });
  }

  /**
   * Get user's activity log
   */
  async getUserActivityLog(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ logs: AuditLogDocument[]; pagination: any }> {
    try {
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        AuditLog.find({ userId: new Types.ObjectId(userId) })
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit),
        AuditLog.countDocuments({ userId: new Types.ObjectId(userId) }),
      ]);

      const pagination = PaginationHelper.createMeta(page, limit, total);

      return { logs, pagination };
    } catch (error) {
      logger.error('Failed to get user activity log', { userId, error });
      throw error;
    }
  }

  /**
   * Get security events for user
   */
  async getUserSecurityEvents(userId: string, page: number = 1, limit: number = 20): Promise<{ events: AuditLogDocument[]; pagination: any }> {
    try {
      const securityActions = [
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'LOGOUT',
        'PASSWORD_CHANGED',
        'PASSWORD_RESET',
        'DEVICE_ADDED',
        'DEVICE_BLOCKED',
        'MFA_ENABLED',
        'MFA_DISABLED',
      ];

      const skip = (page - 1) * limit;

      const [events, total] = await Promise.all([
        AuditLog.find({
          userId: new Types.ObjectId(userId),
          action: { $in: securityActions },
        })
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit),
        AuditLog.countDocuments({
          userId: new Types.ObjectId(userId),
          action: { $in: securityActions },
        }),
      ]);

      const pagination = PaginationHelper.createMeta(page, limit, total);

      return { events, pagination };
    } catch (error) {
      logger.error('Failed to get security events', { userId, error });
      throw error;
    }
  }

  /**
   * Get failed login attempts
   */
  async getFailedLoginAttempts(userId: string, hours: number = 24): Promise<AuditLogDocument[]> {
    try {
      const since = new Date();
      since.setHours(since.getHours() - hours);

      return await AuditLog.find({
        userId: new Types.ObjectId(userId),
        action: 'LOGIN_FAILED',
        timestamp: { $gte: since },
      }).sort({ timestamp: -1 });
    } catch (error) {
      logger.error('Failed to get failed login attempts', { userId, error });
      throw error;
    }
  }

  /**
   * Check for suspicious activity
   */
  async checkSuspiciousActivity(userId: string): Promise<boolean> {
    try {
      // Check for multiple failed logins in last hour
      const failedAttempts = await AuditLog.countDocuments({
        userId: new Types.ObjectId(userId),
        action: 'LOGIN_FAILED',
        timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
      });

      if (failedAttempts > 5) {
        logger.warn('Suspicious activity detected - multiple failed logins', { userId });
        return true;
      }

      // Check for login from new location
      const recentSessions = await AuditLog.find({
        userId: new Types.ObjectId(userId),
        action: 'LOGIN_SUCCESS',
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })
        .sort({ timestamp: -1 })
        .limit(10);

      const ipAddresses = new Set(recentSessions.map((log) => log.ipAddress));

      if (ipAddresses.size > 5) {
        logger.warn('Suspicious activity detected - logins from multiple locations', { userId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to check suspicious activity', { userId, error });
      return false;
    }
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(userId?: string, startDate?: Date, endDate?: Date): Promise<AuditLogDocument[]> {
    try {
      const query: any = {};

      if (userId) {
        query.userId = new Types.ObjectId(userId);
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
      }

      return await AuditLog.find(query).sort({ timestamp: -1 });
    } catch (error) {
      logger.error('Failed to export audit logs', { userId, error });
      throw error;
    }
  }
}

export const auditService = new AuditService();

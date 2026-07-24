import { Schema, model, Document } from 'mongoose';

export interface AuditLogDocument extends Document {
  userId: Schema.Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  correlationId?: string;
  timestamp: Date;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'LOGOUT',
        'LOGOUT_EVERYWHERE',
        'PASSWORD_CHANGED',
        'PASSWORD_RESET',
        'PASSWORD_RESET_REQUESTED',
        'EMAIL_VERIFIED',
        'EMAIL_VERIFICATION_REQUESTED',
        'SUBSCRIPTION_UPGRADED',
        'SUBSCRIPTION_DOWNGRADED',
        'SUBSCRIPTION_CANCELLED',
        'SUBSCRIPTION_RENEWED',
        'PROFILE_UPDATED',
        'DEVICE_ADDED',
        'DEVICE_REMOVED',
        'DEVICE_TRUSTED',
        'DEVICE_BLOCKED',
        'SESSION_CREATED',
        'SESSION_TERMINATED',
        'MFA_ENABLED',
        'MFA_DISABLED',
        'API_KEY_CREATED',
        'API_KEY_REVOKED',
        'RESOURCE_ACCESSED',
        'RESOURCE_DOWNLOADED',
      ],
      index: true,
    },
    resource: {
      type: String,
      required: true,
      enum: ['auth', 'subscription', 'profile', 'device', 'session', 'resource', 'event', 'community'],
      index: true,
    },
    resourceId: {
      type: String,
      sparse: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'failure'],
      required: true,
      index: true,
    },
    errorMessage: {
      type: String,
      sparse: true,
    },
    correlationId: {
      type: String,
      sparse: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// TTL Index - keep audit logs for 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });

export const AuditLog = model<AuditLogDocument>('AuditLog', auditLogSchema);

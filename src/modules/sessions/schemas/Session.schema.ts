import { Schema, model, Document, Types } from 'mongoose';

export interface SessionDocument extends Document {
  userId: Types.ObjectId;
  deviceId: Types.ObjectId;
  refreshTokenHash: string;
  refreshTokenExpiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  lastActivityAt: Date;
  createdAt: Date;
  expiresAt: Date;
}

const sessionSchema = new Schema<SessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Device',
      sparse: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      select: false, // Don't return hash by default
    },
    refreshTokenExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastActivityAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
      // TTL index: MongoDB will auto-delete expired documents
    },
  },
  {
    timestamps: true,
  }
);

// TTL Index - auto-delete sessions after expiry
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Indexes for common queries
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ refreshTokenExpiresAt: 1 });

export const Session = model<SessionDocument>('Session', sessionSchema);

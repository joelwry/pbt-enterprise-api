import { Schema, model, Document, Types } from 'mongoose';

export interface DeviceDocument extends Document {
  userId: Types.ObjectId;
  fingerprint: string;
  ipAddress: string;
  userAgent: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browserName: string;
  osName: string;
  deviceName: string;
  isTrusted: boolean;
  isBlocked: boolean;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<DeviceDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fingerprint: {
      type: String,
      required: true,
      unique: false, // Multiple users can have same fingerprint from same device
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
      required: true,
    },
    browserName: {
      type: String,
      required: true,
    },
    osName: {
      type: String,
      required: true,
    },
    deviceName: {
      type: String,
      default: 'Device',
    },
    isTrusted: {
      type: Boolean,
      default: false,
      index: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
deviceSchema.index({ userId: 1, isTrusted: 1 });
deviceSchema.index({ userId: 1, isBlocked: 1 });
deviceSchema.index({ userId: 1, lastUsedAt: -1 });
deviceSchema.index({ fingerprint: 1 });

export const Device = model<DeviceDocument>('Device', deviceSchema);

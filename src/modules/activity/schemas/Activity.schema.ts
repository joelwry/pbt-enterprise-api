import { Schema, model, Types } from 'mongoose';

interface IActivity {
  memberId: Types.ObjectId;
  activityType: string;
  itemId: Types.ObjectId;
  itemType: string;
  description: string;
  metadata?: Record<string, any>;
  visibility: 'private' | 'members-only' | 'public';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const activitySchema = new Schema<IActivity>({
  memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  activityType: { type: String, required: true },
  itemId: Schema.Types.ObjectId,
  itemType: String,
  description: String,
  metadata: Schema.Types.Mixed,
  visibility: { type: String, enum: ['private', 'members-only', 'public'], default: 'private' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date,
});

activitySchema.index({ memberId: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1, visibility: 1 });

export const Activity = model<IActivity>('Activity', activitySchema);
export type { IActivity };

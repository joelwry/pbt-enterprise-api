import { Schema, model } from 'mongoose';

interface IRecommendation {
  memberId: Schema.Types.ObjectId;
  itemId: Schema.Types.ObjectId;
  itemType: 'programme' | 'event' | 'mentor' | 'resource' | 'powerteam' | 'insight';
  reason: string;
  relevanceScore: number;
  createdAt: Date;
  expiresAt: Date;
  engaged: boolean;
  updatedAt: Date;
  deletedAt?: Date;
}

const recommendationSchema = new Schema<IRecommendation>({
  memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  itemId: { type: Schema.Types.ObjectId, required: true },
  itemType: { type: String, enum: ['programme', 'event', 'mentor', 'resource', 'powerteam', 'insight'], required: true },
  reason: String,
  relevanceScore: { type: Number, min: 0, max: 100, default: 50 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
  engaged: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date,
});

recommendationSchema.index({ memberId: 1, itemType: 1, relevanceScore: -1 });
recommendationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Recommendation = model<IRecommendation>('Recommendation', recommendationSchema);
export type { IRecommendation };

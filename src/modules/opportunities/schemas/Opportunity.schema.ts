import { Schema, model } from 'mongoose';

interface IOpportunity {
  memberId: Schema.Types.ObjectId;
  type: 'networking' | 'collaboration' | 'partnership' | 'event' | 'speaking' | 'venture';
  title: string;
  description: string;
  relevanceScore: number;
  suggestedConnections?: Schema.Types.ObjectId[];
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  expiresAt: Date;
  responded?: boolean;
  updatedAt: Date;
  deletedAt?: Date;
}

const opportunitySchema = new Schema<IOpportunity>({
  memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['networking', 'collaboration', 'partnership', 'event', 'speaking', 'venture'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  relevanceScore: { type: Number, min: 0, max: 100, default: 50 },
  suggestedConnections: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
  responded: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date,
});

opportunitySchema.index({ memberId: 1, status: 1, relevanceScore: -1 });

export const Opportunity = model<IOpportunity>('Opportunity', opportunitySchema);
export type { IOpportunity };

import { Schema, model, Types } from 'mongoose';

interface IMemberIntroduction {
  fromMemberId: Types.ObjectId;
  toMemberId: Types.ObjectId;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  connectionStrength: number;
  connectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const memberIntroductionSchema = new Schema<IMemberIntroduction>({
  fromMemberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  toMemberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, maxlength: 500 },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  connectionStrength: { type: Number, min: 0, max: 100, default: 0 },
  connectedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date,
});

memberIntroductionSchema.index({ fromMemberId: 1, status: 1 });
memberIntroductionSchema.index({ toMemberId: 1, status: 1 });

export const MemberIntroduction = model<IMemberIntroduction>('MemberIntroduction', memberIntroductionSchema);
export type { IMemberIntroduction };

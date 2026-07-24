import { Schema, model } from 'mongoose';

interface IMemberIntroduction {
  fromMemberId: Schema.Types.ObjectId;
  toMemberId: Schema.Types.ObjectId;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  connectionStrength: number;
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date,
});

memberIntroductionSchema.index({ fromMemberId: 1, status: 1 });
memberIntroductionSchema.index({ toMemberId: 1, status: 1 });

export const MemberIntroduction = model<IMemberIntroduction>('MemberIntroduction', memberIntroductionSchema);
export type { IMemberIntroduction };

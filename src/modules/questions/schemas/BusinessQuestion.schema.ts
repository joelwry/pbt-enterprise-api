import { Schema, model, Types } from 'mongoose';

interface IBusinessQuestion {
  memberId: Types.ObjectId;
  title: string;
  description: string;
  category: string;
  status: string;
  views: number;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const businessQuestionSchema = new Schema<IBusinessQuestion>({
  memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, default: 'open' },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date,
});

businessQuestionSchema.index({ status: 1, createdAt: -1 });

export const BusinessQuestion = model<IBusinessQuestion>('BusinessQuestion', businessQuestionSchema);
export type { IBusinessQuestion };

import { Schema, model } from 'mongoose';

interface ISuccessStory {
  memberId: Schema.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  featured: boolean;
  status: string;
  likes: number;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const successStorySchema = new Schema<ISuccessStory>({
  memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true },
  category: { type: String, required: true },
  featured: { type: Boolean, default: false },
  status: { type: String, default: 'draft' },
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date,
});

successStorySchema.index({ status: 1, createdAt: -1 });

export const SuccessStory = model<ISuccessStory>('SuccessStory', successStorySchema);
export type { ISuccessStory };

import { Schema, model } from 'mongoose';

interface IIndustryInsight {
  title: string;
  description: string;
  category: string;
  source?: string;
  content: string;
  featured: boolean;
  views: number;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const industryInsightSchema = new Schema<IIndustryInsight>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  source: String,
  content: { type: String, required: true },
  featured: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date,
});

industryInsightSchema.index({ featured: -1, createdAt: -1 });
industryInsightSchema.index({ category: 1, views: -1 });

export const IndustryInsight = model<IIndustryInsight>('IndustryInsight', industryInsightSchema);
export type { IIndustryInsight };

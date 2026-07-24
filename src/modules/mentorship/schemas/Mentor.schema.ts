import { Schema, model } from 'mongoose';

interface IMentor {
  memberId: Schema.Types.ObjectId;
  bio: string;
  expertise: string[];
  availability: string;
  hourlyRate?: number;
  rating: number;
  totalReviews: number;
  sessionCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const mentorSchema = new Schema<IMentor>({
  memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bio: String,
  expertise: [String],
  availability: String,
  hourlyRate: Number,
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  sessionCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date,
});

mentorSchema.index({ rating: -1, sessionCount: -1 });

export const Mentor = model<IMentor>('Mentor', mentorSchema);
export type { IMentor };

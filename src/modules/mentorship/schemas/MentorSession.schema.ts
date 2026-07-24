import { Schema, model, Types } from 'mongoose';

interface IMentorSession {
  mentorId: Types.ObjectId;
  memberId: Types.ObjectId;
  scheduledAt: Date;
  duration: number;
  topic: string;
  status: string;
  notes?: string;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const mentorSessionSchema = new Schema<IMentorSession>({
  mentorId: { type: Schema.Types.ObjectId, ref: 'Mentor', required: true },
  memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: { type: Date, required: true },
  duration: { type: Number, required: true },
  topic: String,
  status: { type: String, default: 'scheduled' },
  notes: String,
  rating: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date,
});

mentorSessionSchema.index({ mentorId: 1, scheduledAt: 1 });
mentorSessionSchema.index({ memberId: 1, status: 1 });

export const MentorSession = model<IMentorSession>('MentorSession', mentorSessionSchema);
export type { IMentorSession };

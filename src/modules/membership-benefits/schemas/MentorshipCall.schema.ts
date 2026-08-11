import { Schema, model, Document, Types } from 'mongoose';

export interface IMentorshipCall extends Document {
  memberId: Types.ObjectId;
  leaderId: Types.ObjectId;
  topic: string;
  scheduledAt: Date;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const mentorshipCallSchema = new Schema<IMentorshipCall>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    leaderId: {
      type: Schema.Types.ObjectId,
      ref: 'Leader',
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'cancelled'],
      default: 'scheduled',
    },
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'mentorship_calls',
  }
);

mentorshipCallSchema.pre(/^find|^countDocuments|^distinct/, function (this: any) {
  this.where({ deletedAt: { $exists: false } });
});

mentorshipCallSchema.index({ memberId: 1, scheduledAt: -1 });

export const MentorshipCall = model<IMentorshipCall>('MentorshipCall', mentorshipCallSchema);

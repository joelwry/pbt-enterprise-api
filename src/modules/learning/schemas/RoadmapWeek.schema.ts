import { Schema, model, Document, Types } from 'mongoose';

/**
 * Second level of the hierarchy: a time-boxed section of a Roadmap. Modules
 * live inside a week; release timing is still enforced at the Lesson level
 * (see access-control notes on Lesson), a week is purely organisational.
 */
export interface IRoadmapWeek extends Document {
  roadmapId: Types.ObjectId;
  weekNumber: number;
  title: string;
  description?: string;
  /** A milestone week (e.g. after month 2/4) where members review learning so far via a summary video and can submit a question, instead of new module content. */
  isCheckpoint: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roadmapWeekSchema = new Schema<IRoadmapWeek>(
  {
    roadmapId: {
      type: Schema.Types.ObjectId,
      ref: 'Roadmap',
      required: true,
      index: true,
    },
    weekNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    isCheckpoint: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'roadmap_weeks',
  }
);

roadmapWeekSchema.index({ roadmapId: 1, weekNumber: 1 }, { unique: true });

export const RoadmapWeek = model<IRoadmapWeek>('RoadmapWeek', roadmapWeekSchema);

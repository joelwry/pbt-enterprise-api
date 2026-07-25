import { Schema, model, Document } from 'mongoose';

/**
 * Top level of the Business Learning Journey hierarchy: Roadmap → RoadmapWeek
 * → Module → Lesson. One Roadmap per cohort year — members don't "enrol" in
 * it, they progress through it (see pbt_phase3_intgration_guide.md).
 */
export interface IRoadmap extends Document {
  title: string;
  year: string;
  description?: string;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roadmapSchema = new Schema<IRoadmap>(
  {
    title: {
      type: String,
      required: true,
    },
    year: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: String,
    isCurrent: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'roadmaps',
  }
);

export const Roadmap = model<IRoadmap>('Roadmap', roadmapSchema);

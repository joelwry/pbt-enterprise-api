import { Schema, model } from 'mongoose';

interface IMilestone {
  userId: string;
  roadmapId: string;
  title: string;
  description: string;
  type: 'completion' | 'streak' | 'achievement' | 'badge';
  requiredValue: number;
  currentValue: number;
  reward?: {
    points: number;
    badge?: string;
    certification?: boolean;
  };
  unlockedAt?: Date;
  isUnlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    roadmapId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    type: {
      type: String,
      enum: ['completion', 'streak', 'achievement', 'badge'],
      required: true,
    },
    requiredValue: {
      type: Number,
      required: true,
    },
    currentValue: {
      type: Number,
      default: 0,
    },
    reward: {
      points: Number,
      badge: String,
      certification: Boolean,
    },
    unlockedAt: Date,
    isUnlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'milestones',
  }
);

milestoneSchema.index({ userId: 1, roadmapId: 1 });
milestoneSchema.index({ userId: 1, isUnlocked: 1 });

export const Milestone = model<IMilestone>('Milestone', milestoneSchema);

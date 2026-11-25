import { Schema, model } from 'mongoose';

export interface ILearningJourney {
  userId: string;
  journeyName: string;
  description?: string;
  programmeIds: string[];
  lessonSequence: string[];
  resources: string[];
  currentStep: number;
  progress: number;
  status: 'active' | 'paused' | 'completed';
  milestones: Array<{
    milestoneId: string;
    completed: boolean;
    completedAt?: Date;
  }>;
  estimatedDurationHours: number;
  startedAt: Date;
  expectedCompletionDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const learningJourneySchema = new Schema<ILearningJourney>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    journeyName: {
      type: String,
      required: true,
    },
    description: String,
    programmeIds: [{ type: String }],
    lessonSequence: [{ type: String }],
    resources: [{ type: String }],
    currentStep: {
      type: Number,
      default: 0,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed'],
      default: 'active',
    },
    milestones: [
      {
        milestoneId: String,
        completed: { type: Boolean, default: false },
        completedAt: Date,
      },
    ],
    estimatedDurationHours: {
      type: Number,
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    expectedCompletionDate: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
    collection: 'learning_journeys',
  }
);

learningJourneySchema.index({ userId: 1, status: 1 });
learningJourneySchema.index({ userId: 1, createdAt: -1 });

export const LearningJourney = model<ILearningJourney>('LearningJourney', learningJourneySchema);

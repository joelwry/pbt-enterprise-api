import { Schema, model } from 'mongoose';

interface IUserProgress {
  userId: string;
  programmeId: string;
  currentModuleId?: string;
  currentLessonId?: string;
  completedModules: string[];
  completedLessons: string[];
  lessonsProgress: Array<{
    lessonId: string;
    completionPercentage: number;
    lastAccessedAt: Date;
    completedAt?: Date;
    timeSpentMinutes: number;
  }>;
  overallProgress: number;
  estimatedCompletionDate?: Date;
  streakDays: number;
  totalLearningMinutes: number;
  bookmarkedItems: string[];
  notes: Array<{
    contentId: string;
    note: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const userProgressSchema = new Schema<IUserProgress>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    programmeId: {
      type: String,
      required: true,
      index: true,
    },
    currentModuleId: String,
    currentLessonId: String,
    completedModules: [{ type: String }],
    completedLessons: [{ type: String }],
    lessonsProgress: [
      {
        lessonId: { type: String, required: true },
        completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
        lastAccessedAt: { type: Date, default: Date.now },
        completedAt: Date,
        timeSpentMinutes: { type: Number, default: 0 },
      },
    ],
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    estimatedCompletionDate: Date,
    streakDays: {
      type: Number,
      default: 0,
    },
    totalLearningMinutes: {
      type: Number,
      default: 0,
    },
    bookmarkedItems: [{ type: String }],
    notes: [
      {
        contentId: String,
        note: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    collection: 'user_progress',
  }
);

// Indexes for performance
userProgressSchema.index({ userId: 1, programmeId: 1 });
userProgressSchema.index({ userId: 1, 'lessonsProgress.completedAt': 1 });

export const UserProgress = model<IUserProgress>('UserProgress', userProgressSchema);

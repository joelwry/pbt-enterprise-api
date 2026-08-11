import { Schema, model, Document, Types } from 'mongoose';

/**
 * UserProgress is NOT a lesson tracker — UserLessonProgress owns that. This
 * is the aggregate member projection (one document per member) that powers
 * the dashboard, Continue Learning, and future recommendations/analytics.
 * It is only ever written by the Learning Progress Service, recalculated
 * whenever a UserLessonProgress record changes — never mutated directly by
 * a controller. See pbt_phase3_intgration_guide.md, "Progress Architecture".
 */
export interface IUserProgress extends Document {
  userId: Types.ObjectId;
  currentRoadmapId?: Types.ObjectId;
  currentRoadmapWeekId?: Types.ObjectId;
  currentModuleId?: Types.ObjectId;
  currentLessonId?: Types.ObjectId;
  completedLessonsCount: number;
  completedModulesCount: number;
  overallProgress: number;
  streakDays: number;
  totalLearningMinutes: number;
  estimatedCompletionDate?: Date;
  bookmarkedItems: Types.ObjectId[];
  notes: Array<{
    contentId: Types.ObjectId;
    note: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const userProgressSchema = new Schema<IUserProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    currentRoadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap' },
    currentRoadmapWeekId: { type: Schema.Types.ObjectId, ref: 'RoadmapWeek' },
    currentModuleId: { type: Schema.Types.ObjectId, ref: 'Module' },
    currentLessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    completedLessonsCount: {
      type: Number,
      default: 0,
    },
    completedModulesCount: {
      type: Number,
      default: 0,
    },
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    streakDays: {
      type: Number,
      default: 0,
    },
    totalLearningMinutes: {
      type: Number,
      default: 0,
    },
    estimatedCompletionDate: Date,
    bookmarkedItems: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
    notes: [
      {
        contentId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
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

export const UserProgress = model<IUserProgress>('UserProgress', userProgressSchema);

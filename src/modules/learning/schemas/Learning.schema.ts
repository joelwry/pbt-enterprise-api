import { Schema, model, Document, Types } from 'mongoose';

export type LessonType = 'Video' | 'Article' | 'PDF' | 'Quiz';
export type LessonStatus = 'completed' | 'in-progress' | 'not-started' | 'locked';
export type MembershipTier = 'Pathway' | 'Plus' | 'Mentorship';

export interface IQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface ILessonAccess {
  unlocksAt: Date;
  requiredTier: MembershipTier;
}

export interface ILessonBody {
  kind: 'video' | 'article' | 'pdf' | 'quiz';
  videoUrl?: string;
  durationLabel?: string;
  transcript?: string;
  readTimeLabel?: string;
  html?: string;
  pageCountLabel?: string;
  fileUrl?: string;
  summary?: string;
  questionCount?: number;
  questions?: IQuizQuestion[];
}

export interface ILesson extends Document {
  moduleId: Types.ObjectId;
  month: number;
  category: string;
  title: string;
  type: LessonType;
  author: string;
  metaLabel: string;
  access: ILessonAccess;
  body: ILessonBody;
  /** Admin "Save as Draft" — hidden from every member-facing query regardless of unlocksAt. */
  isDraft: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface IModule extends Document {
  roadmapWeekId: Types.ObjectId;
  moduleNumber: number;
  title: string;
  description?: string;
  lessons: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface IUserLessonProgress extends Document {
  userId: Types.ObjectId;
  lessonId: Types.ObjectId;
  moduleId: Types.ObjectId;
  status: LessonStatus;
  progressPercent: number;
  timeSpentMinutes: number;
  completedAt?: Date;
  lastAccessedAt: Date;
  quizScore?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Lesson Schema
const lessonSchema = new Schema<ILesson>(
  {
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['Video', 'Article', 'PDF', 'Quiz'],
      required: true,
    },
    author: {
      type: String,
      default: 'PBT Team',
    },
    metaLabel: {
      type: String,
      required: true,
    },
    isDraft: {
      type: Boolean,
      default: false,
      index: true,
    },
    access: {
      unlocksAt: {
        type: Date,
        required: true,
      },
      requiredTier: {
        type: String,
        enum: ['Pathway', 'Plus', 'Mentorship'],
        required: true,
      },
    },
    body: {
      kind: {
        type: String,
        enum: ['video', 'article', 'pdf', 'quiz'],
        required: true,
      },
      videoUrl: String,
      durationLabel: String,
      transcript: String,
      readTimeLabel: String,
      html: String,
      pageCountLabel: String,
      fileUrl: String,
      summary: String,
      questionCount: Number,
      questions: [
        {
          id: String,
          question: String,
          options: [String],
          correctIndex: Number,
        },
      ],
    },
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'lessons',
  }
);

// Module Schema
const moduleSchema = new Schema<IModule>(
  {
    roadmapWeekId: {
      type: Schema.Types.ObjectId,
      ref: 'RoadmapWeek',
      required: true,
      index: true,
    },
    moduleNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    lessons: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Lesson',
      },
    ],
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'modules',
  }
);

// User Lesson Progress Schema
const userLessonProgressSchema = new Schema<IUserLessonProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
      index: true,
    },
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['completed', 'in-progress', 'not-started', 'locked'],
      default: 'not-started',
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    timeSpentMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedAt: {
      type: Date,
    },
    lastAccessedAt: {
      type: Date,
      default: () => new Date(),
    },
    quizScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'user_lesson_progress',
  }
);

// Soft delete middleware
lessonSchema.pre(/^find/, function (this: any) {
  this.where({ deletedAt: { $exists: false } });
});

moduleSchema.pre(/^find/, function (this: any) {
  this.where({ deletedAt: { $exists: false } });
});

userLessonProgressSchema.pre(/^find/, function (this: any) {
  this.where({ deletedAt: { $exists: false } });
});

// Create indexes
lessonSchema.index({ moduleId: 1, type: 1 });
moduleSchema.index({ roadmapWeekId: 1, moduleNumber: 1 });
userLessonProgressSchema.index({ userId: 1, lessonId: 1 });
userLessonProgressSchema.index({ userId: 1, moduleId: 1 });

export const Lesson = model<ILesson>('Lesson', lessonSchema);
export const Module = model<IModule>('Module', moduleSchema);
export const UserLessonProgress = model<IUserLessonProgress>('UserLessonProgress', userLessonProgressSchema);

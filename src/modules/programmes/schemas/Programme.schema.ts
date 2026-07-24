import { Schema, Document, model } from 'mongoose';

// Type definition
export interface IProgramme extends Document {
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in hours
  thumbnail: string;
  banner: string;
  status: 'draft' | 'published' | 'archived';
  learningOutcomes: string[];
  prerequisites: Schema.Types.ObjectId[];
  instructors: {
    instructorId: Schema.Types.ObjectId;
    name: string;
    bio: string;
    avatar: string;
  }[];
  modules: {
    moduleId: Schema.Types.ObjectId;
    title: string;
    order: number;
    description: string;
    lessons: {
      lessonId: Schema.Types.ObjectId;
      title: string;
      order: number;
      duration: number;
      videoUrl?: string;
      description: string;
    }[];
  }[];
  relatedResources: {
    resourceId: Schema.Types.ObjectId;
    type: 'template' | 'checklist' | 'toolkit' | 'playbook' | 'case_study';
    title: string;
  }[];
  relatedEvents: Schema.Types.ObjectId[];
  mentors: Schema.Types.ObjectId[];
  businessOutcomes: string[];
  successMetrics: string[];
  enrollmentCount: number;
  completionRate: number; // percentage
  averageRating: number;
  ratingCount: number;
  requiresSubscription: boolean;
  subscriptionTier?: 'free' | 'pathway' | 'plus' | 'mentorship';
  tags: string[];
  createdBy: Schema.Types.ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Schema definition
const programmeSchema = new Schema<IProgramme>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    shortDescription: {
      type: String,
      required: true,
      maxlength: 200,
    },
    category: {
      type: String,
      required: true,
      enum: ['business', 'property', 'investment', 'networking', 'leadership', 'other'],
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    duration: {
      type: Number,
      required: true,
    },
    thumbnail: {
      type: String,
    },
    banner: {
      type: String,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    learningOutcomes: [String],
    prerequisites: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Programme',
      },
    ],
    instructors: [
      {
        instructorId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        name: String,
        bio: String,
        avatar: String,
      },
    ],
    modules: [
      {
        moduleId: Schema.Types.ObjectId,
        title: String,
        order: Number,
        description: String,
        lessons: [
          {
            lessonId: Schema.Types.ObjectId,
            title: String,
            order: Number,
            duration: Number,
            videoUrl: String,
            description: String,
          },
        ],
      },
    ],
    relatedResources: [
      {
        resourceId: Schema.Types.ObjectId,
        type: String,
        title: String,
      },
    ],
    relatedEvents: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Event',
      },
    ],
    mentors: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Leader',
      },
    ],
    businessOutcomes: [String],
    successMetrics: [String],
    enrollmentCount: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    requiresSubscription: {
      type: Boolean,
      default: false,
    },
    subscriptionTier: {
      type: String,
      enum: ['free', 'pathway', 'plus', 'mentorship'],
    },
    tags: [String],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publishedAt: Date,
    deletedAt: Date,
  },
  {
    timestamps: true,
    collection: 'programmes',
  }
);

// Indexes for performance
programmeSchema.index({ status: 1, publishedAt: -1 });
programmeSchema.index({ category: 1 });
programmeSchema.index({ level: 1 });
programmeSchema.index({ deletedAt: 1 });
programmeSchema.index({ subscriptionTier: 1 });

// Soft delete middleware
programmeSchema.pre(/^find/, function (next: Function) {
  // @ts-ignore
  if (this.where) {
    this.where({ deletedAt: { $exists: false } });
  }
  next();
});

export const ProgrammeModel = model<IProgramme>('Programme', programmeSchema);

import { Schema, model, Document, Types } from 'mongoose';

// Reconciled to match the frontend's actual, already-built shape (member
// leaders-view.tsx / admin leader-editor-view.tsx) -- this module had never
// been wired to auth or either frontend before, so nothing depended on the
// previous shape (name only available via a populated userId, no
// location/yearsActive/isTopMentor, and a required+unique userId that had
// no admin UI path to ever set).
export type LeaderRegion = 'North West' | 'Midlands' | 'London & South East' | 'Scotland';

export interface ILeader extends Document {
  /** Optional link to a real member account -- a Leader profile is admin-authored
   * directory content and doesn't require the person to already have a platform login. */
  userId?: Types.ObjectId;
  fullName: string;
  /** Headline specialty shown as the badge, e.g. "Portfolio Growth Specialist". */
  specialty: string;
  /** Detail-page breakdown of expertise areas. */
  specialties: string[];
  bio: string;
  region: LeaderRegion;
  /** Specific city/sub-region shown under the leader's name, distinct from the broader region tab. */
  location: string;
  yearsActive: number;
  isTopMentor: boolean;
  email: string;
  profileImageUrl: string;
  membersCount: number;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const leaderSchema = new Schema<ILeader>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      index: true,
    },
    specialty: {
      type: String,
      required: true,
    },
    specialties: [
      {
        type: String,
      },
    ],
    bio: {
      type: String,
      required: true,
    },
    region: {
      type: String,
      enum: ['North West', 'Midlands', 'London & South East', 'Scotland'],
      required: true,
      index: true,
    },
    location: {
      type: String,
      default: '',
    },
    yearsActive: {
      type: Number,
      default: 0,
    },
    isTopMentor: {
      type: Boolean,
      default: false,
      index: true,
    },
    email: {
      type: String,
      required: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    profileImageUrl: {
      type: String,
      default: '',
    },
    membersCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'leaders',
  }
);

// Soft delete middleware
leaderSchema.pre(/^find|^countDocuments|^distinct/, function (this: any) {
  this.where({ deletedAt: { $exists: false } });
});

// Create indexes
leaderSchema.index({ region: 1, isActive: 1 });

export const Leader = model<ILeader>('Leader', leaderSchema);

import { Schema, model, Document, Types } from 'mongoose';

export interface ILeader extends Document {
  userId: Types.ObjectId;
  title: string;
  bio: string;
  region: string;
  specialism: string[];
  contactEmail?: string;
  phone?: string;
  profileImageUrl?: string;
  linkedinUrl?: string;
  membersCount: number;
  menteeCount: number;
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
      required: true,
      index: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      required: true,
    },
    region: {
      type: String,
      required: true,
      index: true,
    },
    specialism: [
      {
        type: String,
      },
    ],
    contactEmail: {
      type: String,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
    },
    profileImageUrl: {
      type: String,
    },
    linkedinUrl: {
      type: String,
    },
    membersCount: {
      type: Number,
      default: 0,
    },
    menteeCount: {
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
leaderSchema.pre(/^find/, function (next) {
  // @ts-ignore
  this.where({ deletedAt: { $exists: false } });
  next();
});

// Create indexes
leaderSchema.index({ region: 1, isActive: 1 });
leaderSchema.index({ specialism: 1 });

export const Leader = model<ILeader>('Leader', leaderSchema);

import { Schema, model, Document, Types } from 'mongoose';

export interface IComment {
  id: string;
  userId: Types.ObjectId;
  content: string;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommunityThread extends Document {
  title: string;
  category: string;
  content: string;
  author: Types.ObjectId;
  comments: IComment[];
  likes: number;
  views: number;
  isPinned: boolean;
  isLocked: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const commentSchema = new Schema<IComment>(
  {
    id: String,
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const communityThreadSchema = new Schema<ICommunityThread>(
  {
    title: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    comments: [commentSchema],
    likes: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        lowercase: true,
      },
    ],
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'community_threads',
  }
);

// Soft delete middleware
communityThreadSchema.pre(/^find|^countDocuments/, function (this: any) {
  this.where({ deletedAt: { $exists: false } });
});

// Create indexes
communityThreadSchema.index({ category: 1, isPinned: 1 });
communityThreadSchema.index({ author: 1, createdAt: -1 });

export const CommunityThread = model<ICommunityThread>('CommunityThread', communityThreadSchema);

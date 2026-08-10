import { Schema, model, Document, Types } from 'mongoose';

// Full redesign, per explicit product decision: the controller already
// expected real reply-threading and per-user like tracking; this schema
// only ever supported a flat `comments` array (with its own unrelated
// shape) and a plain numeric `likes` counter. Rebuilt to match what the
// controller (and both frontends) actually need -- real replies and a
// per-user `likedBy` array -- rather than simplifying the controller down
// to fit the old shape. No production data exists for this collection, so
// no migration concerns.
export interface IReply extends Document {
  authorId: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommunityThread extends Document {
  title: string;
  content: string;
  category: string;
  authorId: Types.ObjectId;
  replies: Types.DocumentArray<IReply>;
  /** Per-user like tracking (toggle-able), not a plain counter -- likeCount is replies.length... no, likedBy.length. */
  likedBy: Types.ObjectId[];
  isPinned: boolean;
  isLocked: boolean;
  /** How many members have reported this thread, and the most recent reason -- backs the admin moderation queue. */
  reportCount: number;
  reportReason: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const replySchema = new Schema<IReply>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
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
    content: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: 'general',
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    replies: [replySchema],
    likedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    reportCount: {
      type: Number,
      default: 0,
      index: true,
    },
    reportReason: {
      type: String,
      default: '',
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
communityThreadSchema.pre(/^find|^countDocuments|^distinct/, function (this: any) {
  this.where({ deletedAt: { $exists: false } });
});

// Create indexes
communityThreadSchema.index({ isPinned: -1, createdAt: -1 });
communityThreadSchema.index({ author: 1, createdAt: -1 });

export const CommunityThread = model<ICommunityThread>('CommunityThread', communityThreadSchema);

// A single-slot-at-a-time banner announcement, distinct from a pinned
// *discussion* (CommunityThread.isPinned) -- admin-authored marketing-style
// content shown above the discussion feed, not a post members reply to.
export interface ICommunityAnnouncement extends Document {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  createdBy: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const communityAnnouncementSchema = new Schema<ICommunityAnnouncement>(
  {
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      default: '',
    },
    ctaLabel: {
      type: String,
      default: 'View Community',
    },
    ctaHref: {
      type: String,
      default: '/community',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'community_announcements',
  }
);

export const CommunityAnnouncement = model<ICommunityAnnouncement>(
  'CommunityAnnouncement',
  communityAnnouncementSchema
);

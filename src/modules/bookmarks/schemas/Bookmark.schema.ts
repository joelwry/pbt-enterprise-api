import { Schema, model } from 'mongoose';

interface IBookmark {
  userId: string;
  contentId: string;
  contentType: 'lesson' | 'resource' | 'article' | 'discussion' | 'event';
  title: string;
  category?: string;
  notes?: string;
  snippet?: string;
  highlighted?: boolean;
  priority?: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

const bookmarkSchema = new Schema<IBookmark>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    contentId: {
      type: String,
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['lesson', 'resource', 'article', 'discussion', 'event'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    category: String,
    notes: String,
    snippet: String,
    highlighted: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
  },
  {
    timestamps: true,
    collection: 'bookmarks',
  }
);

bookmarkSchema.index({ userId: 1, contentId: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, contentType: 1 });
bookmarkSchema.index({ userId: 1, priority: 1 });

export const Bookmark = model<IBookmark>('Bookmark', bookmarkSchema);

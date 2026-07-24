import { Bookmark } from '../schemas/Bookmark.schema';
import { AppError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

export class BookmarkService {
  async getBookmarks(userId: string, filters?: { contentType?: string; priority?: string; category?: string }) {
    try {
      const query: any = { userId };

      if (filters?.contentType) query.contentType = filters.contentType;
      if (filters?.priority) query.priority = filters.priority;
      if (filters?.category) query.category = filters.category;

      const bookmarks = await Bookmark.find(query).sort({ createdAt: -1 });
      return bookmarks;
    } catch (error) {
      logger.error('Error fetching bookmarks', { userId, error });
      throw error;
    }
  }

  async createBookmark(userId: string, bookmarkData: any) {
    try {
      const existingBookmark = await Bookmark.findOne({ userId, contentId: bookmarkData.contentId });
      if (existingBookmark) {
        throw new AppError('Bookmark already exists', 409, 'ERR_5001');
      }

      const bookmark = new Bookmark({
        userId,
        ...bookmarkData,
      });

      await bookmark.save();
      logger.info('Bookmark created', { userId, contentId: bookmarkData.contentId });
      return bookmark;
    } catch (error) {
      logger.error('Error creating bookmark', { userId, error });
      throw error;
    }
  }

  async removeBookmark(userId: string, contentId: string) {
    try {
      const bookmark = await Bookmark.findOne({ userId, contentId });
      if (!bookmark) {
        throw new AppError('Bookmark not found', 404, 'ERR_5002');
      }

      await Bookmark.deleteOne({ userId, contentId });
      logger.info('Bookmark removed', { userId, contentId });
      return { success: true };
    } catch (error) {
      logger.error('Error removing bookmark', { userId, contentId, error });
      throw error;
    }
  }

  async updateBookmark(userId: string, contentId: string, updates: any) {
    try {
      const bookmark = await Bookmark.findOneAndUpdate({ userId, contentId }, updates, { new: true });

      if (!bookmark) {
        throw new AppError('Bookmark not found', 404, 'ERR_5002');
      }

      logger.info('Bookmark updated', { userId, contentId });
      return bookmark;
    } catch (error) {
      logger.error('Error updating bookmark', { userId, contentId, error });
      throw error;
    }
  }

  async getBookmarksByCategory(userId: string, category: string) {
    try {
      const bookmarks = await Bookmark.find({ userId, category }).sort({ priority: -1, createdAt: -1 });
      return bookmarks;
    } catch (error) {
      logger.error('Error fetching bookmarks by category', { userId, category, error });
      throw error;
    }
  }

  async getHighPriorityBookmarks(userId: string, limit: number = 10) {
    try {
      const bookmarks = await Bookmark.find({ userId, priority: 'high' }).limit(limit).sort({ createdAt: -1 });
      return bookmarks;
    } catch (error) {
      logger.error('Error fetching high priority bookmarks', { userId, error });
      throw error;
    }
  }

  async countBookmarks(userId: string) {
    try {
      const count = await Bookmark.countDocuments({ userId });
      return count;
    } catch (error) {
      logger.error('Error counting bookmarks', { userId, error });
      throw error;
    }
  }
}

export default new BookmarkService();

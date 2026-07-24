import { Request, Response } from 'express';
import { asyncHandler } from '@/core/middleware/asyncHandler';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import BookmarkService from '../services/bookmark.service';

export class BookmarkController {
  getBookmarks = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { contentType, priority, category } = req.query;

    const bookmarks = await BookmarkService.getBookmarks(userId, {
      contentType: contentType as string,
      priority: priority as string,
      category: category as string,
    });

    return ResponseHandler.success(res, bookmarks, 'Bookmarks retrieved');
  });

  createBookmark = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { contentId, contentType, title, category, notes, highlighted, priority } = req.body;

    const bookmark = await BookmarkService.createBookmark(userId, {
      contentId,
      contentType,
      title,
      category,
      notes,
      highlighted,
      priority,
    });

    return ResponseHandler.success(res, bookmark, 'Bookmark created', 201);
  });

  removeBookmark = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { contentId } = req.params;

    await BookmarkService.removeBookmark(userId, contentId);
    return ResponseHandler.success(res, { success: true }, 'Bookmark removed');
  });

  updateBookmark = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { contentId } = req.params;
    const updates = req.body;

    const bookmark = await BookmarkService.updateBookmark(userId, contentId, updates);
    return ResponseHandler.success(res, bookmark, 'Bookmark updated');
  });

  getByCategory = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { category } = req.params;

    const bookmarks = await BookmarkService.getBookmarksByCategory(userId, category);
    return ResponseHandler.success(res, bookmarks, 'Bookmarks retrieved');
  });

  getHighPriority = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { limit } = req.query;

    const bookmarks = await BookmarkService.getHighPriorityBookmarks(userId, parseInt(limit as string) || 10);
    return ResponseHandler.success(res, bookmarks, 'High priority bookmarks retrieved');
  });
}

export default new BookmarkController();

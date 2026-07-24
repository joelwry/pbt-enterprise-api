import { Request, Response } from 'express';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { asyncHandler } from '@/core/middleware/asyncHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';
import { CommunityThread } from '@/modules/community/schemas/Community.schema';
import { AppError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

export class CommunityController {
  /**
   * Get community threads with pagination and filtering
   */
  static getThreads = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { page = 1, limit = 20, category, search } = req.query;

    const pagination = PaginationHelper.parse({ page: page as string, limit: limit as string });

    let query: any = { deletedAt: null };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const threads = await CommunityThread.find(query)
      .select('-__v')
      .sort({ pinnedAt: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('createdBy', 'firstName lastName avatar')
      .lean();

    const totalItems = await CommunityThread.countDocuments(query);
    const paginationData = PaginationHelper.createMeta(pagination.page, pagination.limit, totalItems);

    logger.info(`[CommunityController] Fetched ${threads.length} threads for user ${userId}`);

    return ResponseHandler.paginated(res, 200, 'Threads retrieved successfully', threads, paginationData);
  });

  /**
   * Get single thread with replies
   */
  static getThreadDetail = asyncHandler(async (req: Request, res: Response) => {
    const { threadId } = req.params;
    const userId = (req as any).userId;

    const thread = await CommunityThread.findOne({ _id: threadId, deletedAt: null })
      .populate('createdBy', 'firstName lastName avatar role')
      .populate({
        path: 'replies',
        populate: {
          path: 'createdBy',
          select: 'firstName lastName avatar role',
        },
      })
      .lean();

    if (!thread) {
      throw new AppError(404, 'Thread not found');
    }

    // Increment view count
    await CommunityThread.findByIdAndUpdate(threadId, { $inc: { viewCount: 1 } });

    logger.info(`[CommunityController] Fetched thread ${threadId} for user ${userId}`);

    return ResponseHandler.ok(res, 'Thread retrieved successfully', thread);
  });

  /**
   * Create new community thread
   */
  static createThread = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { title, description, category, attachments } = req.body;

    const newThread = new CommunityThread({
      title,
      description,
      category,
      attachments: attachments || [],
      createdBy: userId,
      replyCount: 0,
      viewCount: 0,
    });

    await newThread.save();
    await newThread.populate('createdBy', 'firstName lastName avatar');

    logger.info(`[CommunityController] Created thread ${newThread._id} by user ${userId}`);

    return ResponseHandler.created(res, 'Thread created successfully', newThread);
  });

  /**
   * Add reply to thread
   */
  static addReply = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { threadId } = req.params;
    const { content, attachments } = req.body;

    const thread = await CommunityThread.findOne({ _id: threadId, deletedAt: null });

    if (!thread) {
      throw new AppError(404, 'Thread not found');
    }

    const newReply = {
      content,
      attachments: attachments || [],
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    thread.replies.push(newReply as any);
    thread.replyCount += 1;
    await thread.save();

    await thread.populate('createdBy', 'firstName lastName avatar');

    logger.info(`[CommunityController] Added reply to thread ${threadId} by user ${userId}`);

    return ResponseHandler.created(res, 'Reply added successfully', newReply);
  });

  /**
   * Like/Unlike thread
   */
  static toggleLike = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { threadId } = req.params;

    const thread = await CommunityThread.findOne({ _id: threadId, deletedAt: null });

    if (!thread) {
      throw new AppError(404, 'Thread not found');
    }

    const alreadyLiked = thread.likes.includes(userId);

    if (alreadyLiked) {
      thread.likes = thread.likes.filter((id) => id.toString() !== userId);
    } else {
      thread.likes.push(userId);
    }

    await thread.save();

    logger.info(
      `[CommunityController] User ${userId} ${alreadyLiked ? 'unliked' : 'liked'} thread ${threadId}`
    );

    return ResponseHandler.ok(res, 'Like toggled successfully', { liked: !alreadyLiked });
  });

  /**
   * Get community categories
   */
  static getCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = [
      { id: 'general', label: 'General Discussion' },
      { id: 'strategies', label: 'Strategies & Tips' },
      { id: 'deals', label: 'Deal Analysis' },
      { id: 'investing', label: 'Investing Questions' },
      { id: 'mindset', label: 'Mindset & Motivation' },
      { id: 'off-topic', label: 'Off Topic' },
    ];

    return ResponseHandler.ok(res, 'Categories retrieved successfully', categories);
  });
}

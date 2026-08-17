import { Request, Response } from 'express';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';
import { AppError, NotFoundError } from '@/core/errors/AppError';
import { CommunityThread } from '@/modules/community/schemas/Community.schema';
import {
  getCommunityMeta,
  toDiscussionListDto,
  toDiscussionDetailDto,
} from '@/modules/community/services/community.service';
import activityService from '@/modules/activity/services/activity.service';
import logger from '@/core/logger/logger';

const AUTHOR_SELECT = 'fullName';

export class CommunityController {
  static getMeta = catchAsync(async (req: Request, res: Response) => {
    const meta = await getCommunityMeta();
    ResponseHandler.ok(res, 'Community data retrieved successfully', meta);
  });

  static getThreads = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { page = 1, limit = 20, category, search } = req.query;
    const pagination = PaginationHelper.parse({ page: page as string, limit: limit as string });

    const filter: any = {};
    if (category && category !== 'All') filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const [threads, totalItems] = await Promise.all([
      CommunityThread.find(filter)
        .populate('authorId', AUTHOR_SELECT)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      CommunityThread.countDocuments(filter),
    ]);

    const items = await Promise.all(threads.map((thread) => toDiscussionListDto(thread, userId)));
    const paginationData = PaginationHelper.createMeta(pagination.page, pagination.limit, totalItems);

    ResponseHandler.paginated(res, 200, 'Threads retrieved successfully', items, paginationData);
  });

  static getThreadDetail = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { threadId } = req.params;

    const thread = await CommunityThread.findById(threadId)
      .populate('authorId', AUTHOR_SELECT)
      .populate('replies.authorId', AUTHOR_SELECT);

    if (!thread) {
      throw new NotFoundError('Thread not found');
    }

    const dto = await toDiscussionDetailDto(thread, userId);
    ResponseHandler.ok(res, 'Thread retrieved successfully', dto);
  });

  static createThread = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { title, content, category } = req.body;

    const thread = await CommunityThread.create({
      title,
      content,
      category: category || 'general',
      authorId: userId,
    });
    await thread.populate('authorId', AUTHOR_SELECT);

    logger.info('Community thread created', { threadId: thread._id, userId });
    await activityService.logActivity(userId, 'community_post_created', {
      itemId: thread._id,
      itemType: 'discussion',
      description: `Posted "${thread.title}" in Community Group`,
    });

    const dto = await toDiscussionDetailDto(thread, userId);
    ResponseHandler.created(res, 'Thread created successfully', dto);
  });

  static addReply = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { threadId } = req.params;
    const { content } = req.body;

    const thread = await CommunityThread.findById(threadId);
    if (!thread) {
      throw new NotFoundError('Thread not found');
    }
    if (thread.isLocked) {
      throw new AppError(400, 'This discussion is locked and no longer accepting replies');
    }

    thread.replies.push({ authorId: userId, content } as any);
    await thread.save();
    await thread.populate('authorId', AUTHOR_SELECT);
    await thread.populate('replies.authorId', AUTHOR_SELECT);

    logger.info('Reply added to community thread', { threadId, userId });

    const dto = await toDiscussionDetailDto(thread, userId);
    ResponseHandler.created(res, 'Reply added successfully', dto);
  });

  static toggleLike = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { threadId } = req.params;

    const thread = await CommunityThread.findById(threadId);
    if (!thread) {
      throw new NotFoundError('Thread not found');
    }

    const alreadyLiked = thread.likedBy.some((id) => id.toString() === userId);
    if (alreadyLiked) {
      thread.likedBy = thread.likedBy.filter((id) => id.toString() !== userId) as any;
    } else {
      thread.likedBy.push(userId as any);
    }
    await thread.save();
    await thread.populate('authorId', AUTHOR_SELECT);
    await thread.populate('replies.authorId', AUTHOR_SELECT);

    logger.info(`User ${userId} ${alreadyLiked ? 'unliked' : 'liked'} thread ${threadId}`);

    const dto = await toDiscussionDetailDto(thread, userId);
    ResponseHandler.ok(res, 'Like toggled successfully', dto);
  });

  static reportThread = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { threadId } = req.params;
    const { reason } = req.body;

    const thread = await CommunityThread.findById(threadId);
    if (!thread) {
      throw new NotFoundError('Thread not found');
    }

    // Same dedup rule as likes -- without it, one member repeatedly
    // reporting the same post inflates reportCount and makes a post look
    // more widely reported than it is.
    const alreadyReported = thread.reportedBy.some((id) => id.toString() === userId);
    if (!alreadyReported) {
      thread.reportedBy.push(userId as any);
      thread.reportCount += 1;
      thread.reportReason = reason || 'No reason given';
      await thread.save();
    }

    logger.info('Community thread reported', { threadId, reason, deduped: alreadyReported });
    ResponseHandler.ok(res, 'Thread reported for review', { reported: true });
  });

  static getCategories = catchAsync(async (req: Request, res: Response) => {
    const categories = [
      { id: 'general', label: 'General Discussion' },
      { id: 'strategies', label: 'Strategies & Tips' },
      { id: 'deals', label: 'Deal Analysis' },
      { id: 'investing', label: 'Investing Questions' },
      { id: 'mindset', label: 'Mindset & Motivation' },
      { id: 'off-topic', label: 'Off Topic' },
    ];

    ResponseHandler.ok(res, 'Categories retrieved successfully', categories);
  });
}

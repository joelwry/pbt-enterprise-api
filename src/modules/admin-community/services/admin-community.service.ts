import { Types } from 'mongoose';
import {
  CommunityThread,
  CommunityAnnouncement,
  ICommunityThread,
} from '@/modules/community/schemas/Community.schema';
import { timeAgoLabel, toReplyDto } from '@/modules/community/services/community.service';
import { NotFoundError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

interface PopulatedAuthor {
  _id: Types.ObjectId;
  fullName: string;
}

function toPostSummary(thread: ICommunityThread) {
  const author = thread.authorId as unknown as PopulatedAuthor | null;
  return {
    id: thread._id.toString(),
    title: thread.title,
    authorName: author?.fullName ?? 'Deleted Member',
    replyCount: thread.replies.length,
    likeCount: thread.likedBy.length,
    postedAtLabel: timeAgoLabel(thread.createdAt),
    pinned: thread.isPinned,
  };
}

function toFlaggedPost(thread: ICommunityThread) {
  const author = thread.authorId as unknown as PopulatedAuthor | null;
  const quoteLength = 100;
  return {
    id: thread._id.toString(),
    postTitle: thread.title,
    quote: thread.content.length > quoteLength ? `${thread.content.slice(0, quoteLength)}…` : thread.content,
    reportedByCount: thread.reportCount,
    reason: thread.reportReason || 'No reason given',
    postedByName: author?.fullName ?? 'Deleted Member',
    timeAgoLabel: timeAgoLabel(thread.createdAt),
  };
}

export class AdminCommunityService {
  async getStats() {
    const [totalPosts, flaggedCount, pinnedCount] = await Promise.all([
      CommunityThread.countDocuments({}),
      CommunityThread.countDocuments({ reportCount: { $gt: 0 } }),
      CommunityAnnouncement.countDocuments({ isActive: true }),
    ]);

    return {
      totalPosts,
      totalPostsMonthLabel: 'This month',
      flaggedCount,
      pinnedCount,
      // Community Groups (membership) are a known, deliberately deferred gap.
      groupsCount: 0,
    };
  }

  async listPosts(query: { search?: string; page: number; limit: number }) {
    const { search, page, limit } = query;
    const filter: Record<string, unknown> = {};
    if (search?.trim()) filter.title = { $regex: search.trim(), $options: 'i' };

    const [threads, totalItems] = await Promise.all([
      CommunityThread.find(filter)
        .populate('authorId', 'fullName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      CommunityThread.countDocuments(filter),
    ]);

    return { items: threads.map(toPostSummary), totalItems };
  }

  async getFlaggedPosts() {
    const threads = await CommunityThread.find({ reportCount: { $gt: 0 } })
      .populate('authorId', 'fullName')
      .sort({ reportCount: -1 });
    return threads.map(toFlaggedPost);
  }

  /**
   * Full post body + every reply -- listPosts/getFlaggedPosts only ever
   * return a title/quote-length summary, so a moderator had no way to
   * actually read what was reported (or what any reply said) before
   * pinning or removing it. Reuses the member-facing reply DTO so replies
   * render identically to how the author sees them.
   */
  async getPostDetail(threadId: string) {
    const thread = await CommunityThread.findById(threadId)
      .populate('authorId', 'fullName')
      .populate('replies.authorId', 'fullName');
    if (!thread) throw new NotFoundError('Post not found');

    const author = thread.authorId as unknown as PopulatedAuthor | null;
    const replies = await Promise.all(
      thread.replies.map((reply) => toReplyDto(reply, reply.authorId as unknown as PopulatedAuthor | null))
    );

    return {
      id: thread._id.toString(),
      title: thread.title,
      content: thread.content,
      authorName: author?.fullName ?? 'Deleted Member',
      postedAtLabel: timeAgoLabel(thread.createdAt),
      pinned: thread.isPinned,
      likeCount: thread.likedBy.length,
      reportCount: thread.reportCount,
      reportReason: thread.reportReason || '',
      replies,
    };
  }

  async togglePin(threadId: string) {
    const thread = await CommunityThread.findById(threadId);
    if (!thread) throw new NotFoundError('Post not found');
    thread.isPinned = !thread.isPinned;
    await thread.save();
    logger.info('Community post pin toggled', { threadId, isPinned: thread.isPinned });
    return { pinned: thread.isPinned };
  }

  async approvePost(threadId: string) {
    const thread = await CommunityThread.findByIdAndUpdate(
      threadId,
      { reportCount: 0, reportReason: '', reportedBy: [] },
      { new: true }
    );
    if (!thread) throw new NotFoundError('Post not found');
    logger.info('Community post approved (flag cleared)', { threadId });
  }

  async removePost(threadId: string) {
    const thread = await CommunityThread.findByIdAndUpdate(threadId, { deletedAt: new Date() }, { new: true });
    if (!thread) throw new NotFoundError('Post not found');
    logger.info('Community post removed (soft-deleted)', { threadId });
  }

  async getPinnedAnnouncements() {
    const announcements = await CommunityAnnouncement.find({ isActive: true }).sort({ createdAt: -1 });
    return announcements.map((a) => ({
      id: a._id.toString(),
      title: a.title,
      pinnedTimeLabel: `Pinned ${timeAgoLabel(a.createdAt)}`,
    }));
  }

  async createPinnedAnnouncement(userId: string, input: { title: string; body?: string; ctaLabel?: string; ctaHref?: string }) {
    const announcement = await CommunityAnnouncement.create({
      title: input.title,
      body: input.body ?? '',
      ctaLabel: input.ctaLabel,
      ctaHref: input.ctaHref,
      createdBy: userId,
    });
    logger.info('Community announcement pinned', { announcementId: announcement._id });
    return { id: announcement._id.toString(), title: announcement.title, pinnedTimeLabel: 'Pinned just now' };
  }

  async unpinAnnouncement(announcementId: string) {
    const announcement = await CommunityAnnouncement.findByIdAndDelete(announcementId);
    if (!announcement) throw new NotFoundError('Announcement not found');
    logger.info('Community announcement unpinned', { announcementId });
  }

  /** Community Groups (membership) are a known, deliberately deferred gap -- no group/membership model exists yet. */
  async getGroups(): Promise<{ id: string; name: string; memberCount: number; status: 'Active' | 'Archived' }[]> {
    return [];
  }
}

export const adminCommunityService = new AdminCommunityService();

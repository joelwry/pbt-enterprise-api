import { Request, Response } from 'express';
import { adminCommunityService } from '@/modules/admin-community/services/admin-community.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';

export class AdminCommunityController {
  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await adminCommunityService.getStats();
    ResponseHandler.ok(res, 'Community stats retrieved successfully', stats);
  }

  async listPosts(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const { items, totalItems } = await adminCommunityService.listPosts({ search, page, limit });
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    ResponseHandler.paginated(res, 200, 'Posts retrieved successfully', items, {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    });
  }

  async getFlaggedPosts(req: Request, res: Response): Promise<void> {
    const posts = await adminCommunityService.getFlaggedPosts();
    ResponseHandler.ok(res, 'Flagged posts retrieved successfully', posts);
  }

  async togglePin(req: Request, res: Response): Promise<void> {
    const result = await adminCommunityService.togglePin(req.params.threadId);
    ResponseHandler.ok(res, result.pinned ? 'Post pinned' : 'Post unpinned', result);
  }

  async approvePost(req: Request, res: Response): Promise<void> {
    await adminCommunityService.approvePost(req.params.threadId);
    ResponseHandler.ok(res, 'Post approved', { approved: true });
  }

  async removePost(req: Request, res: Response): Promise<void> {
    await adminCommunityService.removePost(req.params.threadId);
    ResponseHandler.ok(res, 'Post removed', { removed: true });
  }

  async getPinnedAnnouncements(req: Request, res: Response): Promise<void> {
    const announcements = await adminCommunityService.getPinnedAnnouncements();
    ResponseHandler.ok(res, 'Pinned announcements retrieved successfully', announcements);
  }

  async createPinnedAnnouncement(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }
    const announcement = await adminCommunityService.createPinnedAnnouncement(req.user.userId, req.body);
    ResponseHandler.created(res, 'Announcement pinned', announcement);
  }

  async unpinAnnouncement(req: Request, res: Response): Promise<void> {
    await adminCommunityService.unpinAnnouncement(req.params.announcementId);
    ResponseHandler.ok(res, 'Announcement unpinned', { unpinned: true });
  }

  async getGroups(req: Request, res: Response): Promise<void> {
    const groups = await adminCommunityService.getGroups();
    ResponseHandler.ok(res, 'Groups retrieved successfully', groups);
  }
}

export const adminCommunityController = new AdminCommunityController();

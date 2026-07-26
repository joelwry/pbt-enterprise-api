import { Request, Response } from 'express';
import { adminLeadersService } from '@/modules/admin-leaders/services/admin-leaders.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { AppError } from '@/core/errors/AppError';

export class AdminLeadersController {
  async listLeaders(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10);
    const region = (req.query.region as string) ?? 'All';
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const { items, totalItems } = await adminLeadersService.listLeaders({ region: region as any, search, page, limit });
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    ResponseHandler.paginated(res, 200, 'Leaders retrieved', items, {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    });
  }

  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await adminLeadersService.getStats();
    ResponseHandler.ok(res, 'Leader stats retrieved', stats);
  }

  async getLeaderById(req: Request, res: Response): Promise<void> {
    const leader = await adminLeadersService.getLeaderById(req.params.leaderId);
    ResponseHandler.ok(res, 'Leader retrieved', leader);
  }

  async createLeader(req: Request, res: Response): Promise<void> {
    const leader = await adminLeadersService.createLeader(req.body);
    ResponseHandler.created(res, 'Leader created', leader);
  }

  async updateLeader(req: Request, res: Response): Promise<void> {
    const leader = await adminLeadersService.updateLeader(req.params.leaderId, req.body);
    ResponseHandler.ok(res, 'Leader updated', leader);
  }

  async deleteLeader(req: Request, res: Response): Promise<void> {
    await adminLeadersService.deleteLeader(req.params.leaderId);
    ResponseHandler.ok(res, 'Leader deleted', {});
  }

  async uploadPhoto(req: Request, res: Response): Promise<void> {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      throw new AppError(400, 'No file provided');
    }

    const leader = await adminLeadersService.uploadPhoto(req.params.leaderId, {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });

    ResponseHandler.ok(res, 'Photo uploaded', leader);
  }
}

export const adminLeadersController = new AdminLeadersController();

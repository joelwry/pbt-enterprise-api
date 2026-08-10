import { Request, Response } from 'express';
import { adminPowerTeamService } from '@/modules/admin-power-team/services/admin-power-team.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { AppError } from '@/core/errors/AppError';

export class AdminPowerTeamController {
  async listPartners(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10);
    const category = (req.query.category as string) ?? 'All';
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const { items, totalItems } = await adminPowerTeamService.listPartners({ category: category as any, search, page, limit });
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    ResponseHandler.paginated(res, 200, 'Partners retrieved', items, {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    });
  }

  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await adminPowerTeamService.getStats();
    ResponseHandler.ok(res, 'Power Team stats retrieved', stats);
  }

  async getPartnerById(req: Request, res: Response): Promise<void> {
    const partner = await adminPowerTeamService.getPartnerById(req.params.partnerId);
    ResponseHandler.ok(res, 'Partner retrieved', partner);
  }

  async createPartner(req: Request, res: Response): Promise<void> {
    const partner = await adminPowerTeamService.createPartner(req.body);
    ResponseHandler.created(res, 'Partner created', partner);
  }

  async updatePartner(req: Request, res: Response): Promise<void> {
    const partner = await adminPowerTeamService.updatePartner(req.params.partnerId, req.body);
    ResponseHandler.ok(res, 'Partner updated', partner);
  }

  async deletePartner(req: Request, res: Response): Promise<void> {
    await adminPowerTeamService.deletePartner(req.params.partnerId);
    ResponseHandler.ok(res, 'Partner deleted', {});
  }

  async uploadLogo(req: Request, res: Response): Promise<void> {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      throw new AppError(400, 'No file provided');
    }

    const partner = await adminPowerTeamService.uploadLogo(req.params.partnerId, {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });

    ResponseHandler.ok(res, 'Logo uploaded', partner);
  }
}

export const adminPowerTeamController = new AdminPowerTeamController();

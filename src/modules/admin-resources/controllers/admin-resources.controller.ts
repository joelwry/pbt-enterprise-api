import { Request, Response } from 'express';
import { adminResourcesService } from '@/modules/admin-resources/services/admin-resources.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { AppError } from '@/core/errors/AppError';

export class AdminResourcesController {
  async listResources(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10);
    const category = (req.query.category as string) ?? 'All';
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const { items, totalItems } = await adminResourcesService.listResources({ category: category as any, search, page, limit });
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    ResponseHandler.paginated(res, 200, 'Resources retrieved', items, {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    });
  }

  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await adminResourcesService.getStats();
    ResponseHandler.ok(res, 'Resource stats retrieved', stats);
  }

  async getResourceById(req: Request, res: Response): Promise<void> {
    const resource = await adminResourcesService.getResourceById(req.params.resourceId);
    ResponseHandler.ok(res, 'Resource retrieved', resource);
  }

  async createResource(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }
    const resource = await adminResourcesService.createResource(req.user.userId, req.body);
    ResponseHandler.created(res, 'Resource created', resource);
  }

  async updateResource(req: Request, res: Response): Promise<void> {
    const resource = await adminResourcesService.updateResource(req.params.resourceId, req.body);
    ResponseHandler.ok(res, 'Resource updated', resource);
  }

  async deleteResource(req: Request, res: Response): Promise<void> {
    await adminResourcesService.deleteResource(req.params.resourceId);
    ResponseHandler.ok(res, 'Resource deleted', {});
  }

  async uploadFile(req: Request, res: Response): Promise<void> {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      throw new AppError(400, 'No file provided');
    }

    const resource = await adminResourcesService.uploadFile(req.params.resourceId, {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });

    ResponseHandler.ok(res, 'File uploaded', resource);
  }
}

export const adminResourcesController = new AdminResourcesController();

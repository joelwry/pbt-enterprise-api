import { Request, Response } from 'express';
import { Resource } from '@/modules/resources/schemas/Resource.schema';
import { resourcesService } from '@/modules/resources/services/resources.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';

export class ResourcesController {
  /**
   * Get all resources with pagination
   * GET /api/v1/resources
   */
  async getResources(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { page = 1, limit = 20, type, search } = req.query;
    const query = PaginationHelper.parse({
      page: typeof page === 'string' ? page : '1',
      limit: typeof limit === 'string' ? limit : '20',
      search: typeof search === 'string' ? search : '',
    });

    const allowedTiers = await resourcesService.allowedTiersFor(req.user.userId);
    const filter: any = { isActive: true, isDraft: false, requiredTier: { $in: allowedTiers } };

    if (type && typeof type === 'string' && type !== 'All') filter.type = type;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } },
      ];
    }

    const [resources, total] = await Promise.all([
      Resource.find(filter).skip(query.skip).limit(query.limit).sort({ releasedAt: -1 }),
      Resource.countDocuments(filter),
    ]);

    const pagination = PaginationHelper.createMeta(query.page, query.limit, total);
    ResponseHandler.paginated(res, 200, 'Resources retrieved', resources, pagination);
  }

  /**
   * The single featured "Toolkit" banner shown above the resource grid.
   * GET /api/v1/resources/featured
   */
  async getFeatured(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const allowedTiers = await resourcesService.allowedTiersFor(req.user.userId);
    const resource = await resourcesService.getFeatured(allowedTiers);

    if (!resource) {
      ResponseHandler.notFound(res, 'No featured resource available');
      return;
    }

    ResponseHandler.ok(res, 'Featured resource retrieved', resource);
  }

  /**
   * Get resource types (the fixed category taxonomy)
   * GET /api/v1/resources/types/list
   */
  async getTypes(req: Request, res: Response): Promise<void> {
    const types = await Resource.distinct('type', { isActive: true, isDraft: false });
    ResponseHandler.ok(res, 'Types retrieved', types);
  }

  /**
   * Get popular resources
   * GET /api/v1/resources/popular/top
   */
  async getPopularResources(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { limit = 10 } = req.query;
    const allowedTiers = await resourcesService.allowedTiersFor(req.user.userId);

    const resources = await Resource.find({ isActive: true, isDraft: false, requiredTier: { $in: allowedTiers } })
      .sort({ downloads: -1 })
      .limit(Number(limit));

    ResponseHandler.ok(res, 'Popular resources retrieved', resources);
  }

  /**
   * Get resource by ID — a pure read, no side effects (see trackDownload for the download counter).
   * GET /api/v1/resources/:resourceId
   */
  async getResourceById(req: Request, res: Response): Promise<void> {
    const { resourceId } = req.params;
    const resource = await Resource.findById(resourceId).populate('createdBy', 'fullName email');

    if (!resource || resource.isDraft) {
      ResponseHandler.notFound(res, 'Resource not found');
      return;
    }

    ResponseHandler.ok(res, 'Resource retrieved', resource);
  }

  /**
   * Records a download and hands back the file URL to redirect to.
   * POST /api/v1/resources/:resourceId/download
   */
  async downloadResource(req: Request, res: Response): Promise<void> {
    const { resourceId } = req.params;
    const fileUrl = await resourcesService.trackDownload(resourceId);
    ResponseHandler.ok(res, 'Download recorded', { fileUrl });
  }
}

export const resourcesController = new ResourcesController();

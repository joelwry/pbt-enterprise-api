import { Request, Response } from 'express';
import { Resource } from '@/modules/resources/schemas/Resource.schema';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';
import logger from '@/core/logger/logger';

export class ResourcesController {
  /**
   * Get all resources with pagination
   * GET /api/v1/resources
   */
  async getResources(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 20, category, type, search } = req.query;
    const query = PaginationHelper.parse({ 
      page: typeof page === 'string' ? page : '1', 
      limit: typeof limit === 'string' ? limit : '20', 
      search: typeof search === 'string' ? search : '' 
    });

    const filter: any = { isActive: true };

    if (category && typeof category === 'string') filter.category = category;
    if (type && typeof type === 'string') filter.type = type;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } },
      ];
    }

    const resources = await Resource.find(filter)
      .skip(query.skip)
      .limit(query.limit)
      .sort({ releasedAt: -1 });

    const total = await Resource.countDocuments(filter);

    const pagination = PaginationHelper.createMeta(query.page, query.limit, total);
    ResponseHandler.paginated(res, 200, 'Resources retrieved', resources, pagination);
  }

  /**
   * Get resource by ID
   * GET /api/v1/resources/:resourceId
   */
  async getResourceById(req: Request, res: Response): Promise<void> {
    const { resourceId } = req.params;

    const resource = await Resource.findByIdAndUpdate(
      resourceId,
      { $inc: { downloads: 1 } },
      { new: true }
    ).populate('createdBy', 'fullName email');

    if (!resource) {
      ResponseHandler.notFound(res, 'Resource not found');
      return;
    }

    ResponseHandler.ok(res, 'Resource retrieved', resource);
  }

  /**
   * Get resource categories
   * GET /api/v1/resources/categories/list
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    const categories = await Resource.distinct('category', { isActive: true });

    ResponseHandler.ok(res, 'Categories retrieved', categories);
  }

  /**
   * Get resource types
   * GET /api/v1/resources/types/list
   */
  async getTypes(req: Request, res: Response): Promise<void> {
    const types = await Resource.distinct('type', { isActive: true });

    ResponseHandler.ok(res, 'Types retrieved', types);
  }

  /**
   * Get popular resources
   * GET /api/v1/resources/popular
   */
  async getPopularResources(req: Request, res: Response): Promise<void> {
    const { limit = 10 } = req.query;

    const resources = await Resource.find({ isActive: true })
      .sort({ downloads: -1 })
      .limit(Number(limit));

    ResponseHandler.ok(res, 'Popular resources retrieved', resources);
  }
}

export const resourcesController = new ResourcesController();

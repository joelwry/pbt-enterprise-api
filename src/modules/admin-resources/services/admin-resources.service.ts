import { Resource, IResource, ResourceType, ResourceTier } from '@/modules/resources/schemas/Resource.schema';
import { storageProvider, UploadedFile } from '@/core/storage';
import { NotFoundError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';
import { signStorageUrl } from '@/core/storage/signedUrl';

export type AdminResourceStatus = 'Published' | 'Draft';

function statusOf(resource: IResource): AdminResourceStatus {
  return resource.isDraft ? 'Draft' : 'Published';
}

function engagementLabelOf(resource: IResource): string {
  if (resource.downloads === 0) return 'New';
  if (resource.downloads >= 1000) return `${(resource.downloads / 1000).toFixed(1)}k downloads`;
  return `${resource.downloads} downloads`;
}

function toAdminResource(resource: IResource) {
  return {
    id: resource._id,
    title: resource.title,
    category: resource.type,
    fileType: resource.fileType,
    engagementLabel: engagementLabelOf(resource),
    status: statusOf(resource),
    description: resource.description,
    visibility: resource.requiredTier,
    metaLabel: resource.metaLabel,
    // Signed, like every other route out of the app -- /uploads no longer
    // serves paid content to an unsigned request, admin or not.
    fileUrl: signStorageUrl(resource.fileUrl),
  };
}

export interface AdminResourceInput {
  title: string;
  category: ResourceType;
  fileType: string;
  description: string;
  requiredTier: ResourceTier;
  isDraft: boolean;
  metaLabel?: string;
}

export class AdminResourcesService {
  async listResources(query: { category?: ResourceType | 'All'; search?: string; page: number; limit: number }) {
    const { category, search, page, limit } = query;

    const filter: Record<string, unknown> = {};
    if (category && category !== 'All') filter.type = category;
    if (search?.trim()) filter.title = { $regex: search.trim(), $options: 'i' };

    const [resources, totalItems] = await Promise.all([
      Resource.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Resource.countDocuments(filter),
    ]);

    return { items: resources.map(toAdminResource), totalItems };
  }

  async getStats() {
    const [publishedTotal, draftsCount, downloadAgg, topCategoryAgg] = await Promise.all([
      Resource.countDocuments({ isDraft: false }),
      Resource.countDocuments({ isDraft: true }),
      Resource.aggregate([{ $group: { _id: null, total: { $sum: '$downloads' } } }]),
      Resource.aggregate([
        { $match: { isDraft: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
    ]);

    const totalDownloads = downloadAgg[0]?.total ?? 0;

    return {
      publishedTotal,
      totalDownloadsLabel: totalDownloads >= 1000 ? `${(totalDownloads / 1000).toFixed(1)}k` : String(totalDownloads),
      draftsCount,
      topCategoryLabel: topCategoryAgg[0]?._id ?? 'None yet',
    };
  }

  async getResourceById(resourceId: string) {
    const resource = await Resource.findById(resourceId);
    if (!resource) throw new NotFoundError('Resource not found');
    return toAdminResource(resource);
  }

  async createResource(userId: string, input: AdminResourceInput) {
    const resource = await Resource.create({
      title: input.title,
      description: input.description,
      type: input.category,
      requiredTier: input.requiredTier,
      fileType: input.fileType,
      metaLabel: input.metaLabel ?? '',
      isDraft: input.isDraft,
      createdBy: userId,
    });
    logger.info('Resource created', { resourceId: resource._id });
    return toAdminResource(resource);
  }

  async updateResource(resourceId: string, input: Partial<AdminResourceInput> & { fileUrl?: string; fileSize?: number }) {
    const update: Record<string, unknown> = {};
    if (input.title !== undefined) update.title = input.title;
    if (input.description !== undefined) update.description = input.description;
    if (input.category !== undefined) update.type = input.category;
    if (input.requiredTier !== undefined) update.requiredTier = input.requiredTier;
    if (input.fileType !== undefined) update.fileType = input.fileType;
    if (input.metaLabel !== undefined) update.metaLabel = input.metaLabel;
    if (input.isDraft !== undefined) update.isDraft = input.isDraft;
    if (input.fileUrl !== undefined) update.fileUrl = input.fileUrl;
    if (input.fileSize !== undefined) update.fileSize = input.fileSize;

    const resource = await Resource.findByIdAndUpdate(resourceId, update, { new: true });
    if (!resource) throw new NotFoundError('Resource not found');
    return toAdminResource(resource);
  }

  async deleteResource(resourceId: string) {
    const resource = await Resource.findByIdAndUpdate(resourceId, { deletedAt: new Date() }, { new: true });
    if (!resource) throw new NotFoundError('Resource not found');
    logger.info('Resource soft-deleted', { resourceId });
  }

  async uploadFile(resourceId: string, file: UploadedFile) {
    const resource = await Resource.findById(resourceId);
    if (!resource) throw new NotFoundError('Resource not found');

    const { url } = await storageProvider.upload(file, `resources/${resourceId}`);
    resource.fileUrl = url;
    resource.fileSize = file.buffer.length;
    await resource.save();

    logger.info('Resource file uploaded', { resourceId, url });
    return toAdminResource(resource);
  }
}

export const adminResourcesService = new AdminResourcesService();

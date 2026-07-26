import { Resource, ResourceTier } from '@/modules/resources/schemas/Resource.schema';
import { subscriptionService } from '@/modules/subscriptions/services/subscription.service';
import { NotFoundError } from '@/core/errors/AppError';

const TIER_RANK: Record<ResourceTier, number> = { Pathway: 1, Plus: 2, Mentorship: 3 };
const ALL_TIERS: ResourceTier[] = ['Pathway', 'Plus', 'Mentorship'];

export class ResourcesService {
  /**
   * Every tier the member's current subscription entitles them to see —
   * used to build a single $in filter for a list query instead of an async
   * per-item canAccessTier() check. No valid subscription -> sees nothing
   * tiered, which matches how the rest of the member portal already gates
   * access (a member with no active subscription never reaches this page).
   */
  async allowedTiersFor(userId: string): Promise<ResourceTier[]> {
    const subscription = await subscriptionService.getCurrentSubscription(userId);
    if (!subscription || !subscriptionService.isSubscriptionValid(subscription)) return [];

    const tierKey = (subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)) as ResourceTier;
    const memberRank = TIER_RANK[tierKey] ?? 0;
    return ALL_TIERS.filter((t) => TIER_RANK[t] <= memberRank);
  }

  /** Records a download and returns the file URL — the member-facing "view" (getResourceById) has no side effects, only this does. */
  async trackDownload(resourceId: string): Promise<string> {
    const resource = await Resource.findByIdAndUpdate(resourceId, { $inc: { downloads: 1 } }, { new: true });
    if (!resource) throw new NotFoundError('Resource not found');
    return resource.fileUrl;
  }

  /** The single "Featured Toolkit" banner: no dedicated admin flag exists for this (deliberately, to avoid adding editor UI for a one-off) — the most-downloaded Toolkit if one exists, else the most-downloaded resource of any type. */
  async getFeatured(allowedTiers: ResourceTier[]) {
    const baseFilter = { isActive: true, isDraft: false, requiredTier: { $in: allowedTiers } };
    const topToolkit = await Resource.findOne({ ...baseFilter, type: 'Toolkit' }).sort({ downloads: -1 });
    if (topToolkit) return topToolkit;
    return Resource.findOne(baseFilter).sort({ downloads: -1 });
  }
}

export const resourcesService = new ResourcesService();

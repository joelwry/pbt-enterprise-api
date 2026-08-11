import { Types } from 'mongoose';
import { SiteSettings, SiteSettingsDocument } from '@/modules/site-settings/schemas/SiteSettings.schema';
import { ValidationError } from '@/core/errors/AppError';

export class SiteSettingsService {
  /** Lazily creates the one settings document (with defaults) the first time anything asks for it. */
  async getSettings(): Promise<SiteSettingsDocument> {
    const existing = await SiteSettings.findOne();
    if (existing) return existing;
    return SiteSettings.create({});
  }

  async updateSettings(updates: { workshopLabel?: string }, adminUserId: string): Promise<SiteSettingsDocument> {
    if (updates.workshopLabel !== undefined && !updates.workshopLabel.trim()) {
      throw new ValidationError('workshopLabel cannot be empty');
    }

    const settings = await this.getSettings();
    if (updates.workshopLabel !== undefined) settings.workshopLabel = updates.workshopLabel.trim();
    settings.updatedBy = new Types.ObjectId(adminUserId);
    return settings.save();
  }
}

export const siteSettingsService = new SiteSettingsService();

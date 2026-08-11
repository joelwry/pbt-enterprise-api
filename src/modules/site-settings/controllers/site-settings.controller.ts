import { Request, Response } from 'express';
import { siteSettingsService } from '@/modules/site-settings/services/site-settings.service';
import { updateSiteSettingsSchema } from '@/modules/site-settings/validators/site-settings.validators';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { AuthenticationError } from '@/core/errors/AppError';

export class SiteSettingsController {
  /** Public -- terminology like the "workshop" label needs to render on pages a visitor can see before logging in. */
  async getPublicSettings(req: Request, res: Response): Promise<void> {
    const settings = await siteSettingsService.getSettings();
    ResponseHandler.ok(res, 'Site settings retrieved successfully', { workshopLabel: settings.workshopLabel });
  }

  async adminUpdateSettings(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthenticationError('User not authenticated');
    const updates = updateSiteSettingsSchema.parse(req.body);
    const settings = await siteSettingsService.updateSettings(updates, req.user.userId);
    ResponseHandler.ok(res, 'Site settings updated successfully', { workshopLabel: settings.workshopLabel });
  }
}

export const siteSettingsController = new SiteSettingsController();

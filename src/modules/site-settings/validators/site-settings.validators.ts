import { z } from 'zod';

export const updateSiteSettingsSchema = z.object({
  workshopLabel: z.string().min(1, 'Cannot be empty').max(60, 'Keep it under 60 characters').optional(),
});

import { z } from 'zod';

export const markPaidSchema = z.object({
  paymentReference: z.string().trim().max(200).optional(),
  adminNote: z.string().trim().max(1000).optional(),
});

export const referralIdParamSchema = z.object({
  referralId: z.string().min(1, 'Referral id is required'),
});

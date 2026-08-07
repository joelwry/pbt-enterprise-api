import { z } from 'zod';

export const tierParamSchema = z.object({
  tier: z.enum(['pathway', 'plus', 'mentorship']),
  billingCycle: z.enum(['monthly', 'annual']),
});

export const setPricingSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
});

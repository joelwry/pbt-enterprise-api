import { z } from 'zod';

const tierSchema = z.enum(['Pathway', 'Plus', 'Mentorship']);
const billingCycleSchema = z.enum(['monthly', 'annual']);

/** Public -- a brand new visitor picking a tier and paying for the first time. */
export const signupCheckoutSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  tier: tierSchema,
  billingCycle: billingCycleSchema,
  referralCode: z.string().optional(),
});

/** Authenticated -- an existing member renewing their current tier, or upgrading/downgrading to a different one. */
export const memberCheckoutSchema = z.object({
  tier: tierSchema,
  billingCycle: billingCycleSchema,
});

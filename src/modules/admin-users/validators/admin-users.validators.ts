import { z } from 'zod';
import { ADMIN_ROLES, ADMIN_SECTIONS } from '@/core/auth/adminAccess';

/**
 * Request validation for the Admin Users & Roles module.
 *
 * This module had none -- alone among the admin modules -- and its
 * controller cast `req.body` straight to its type. Section names were never
 * checked against the known ten, so a typo persisted silently and simply
 * never matched a gate; a bad role failed late and opaquely at the Mongoose
 * layer. Both now fail at the edge with a usable message, which matters
 * more since these values decide what a staff account can reach.
 */

const adminRoleSchema = z.enum(ADMIN_ROLES);
const sectionsSchema = z.array(z.enum(ADMIN_SECTIONS));

export const createAdminAccountSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: z.string().trim().email('A valid email address is required'),
  role: adminRoleSchema,
  // Optional on purpose: omitting it means "use this role's defaults",
  // while `[]` means "no sections at all". Those are different instructions
  // and the service stores them differently.
  sections: sectionsSchema.optional(),
});

export const updateAdminAccountSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  role: adminRoleSchema.optional(),
  sections: sectionsSchema.optional(),
  /** Clears any explicit grants so the role's defaults apply again -- the one thing no `sections` value can express. */
  resetSectionsToRoleDefaults: z.boolean().optional(),
});

export const listAdminAccountsQuerySchema = z.object({
  role: z.union([adminRoleSchema, z.literal('All')]).default('All'),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

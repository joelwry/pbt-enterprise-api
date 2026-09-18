import { Request, Response, NextFunction } from 'express';
import { User } from '@/modules/users/schemas/User.schema';
import { AuthenticationError, AuthorizationError } from '@/core/errors/AppError';

/** Mirrors the frontend's AdminSection union (features/admin-auth/types.ts) -- keep in sync. */
export type AdminSection =
  | 'members'
  | 'content'
  | 'resources'
  | 'events'
  | 'community'
  | 'pbtLeaders'
  | 'powerTeam'
  | 'subscriptions'
  | 'analytics'
  | 'referrals';

/**
 * Gates an admin route to a specific section. A super_admin always passes
 * (matches the frontend's "Super Admins have full access to every section
 * automatically" copy); any other admin needs this section explicitly
 * granted via adminSections.
 *
 * The invite/edit form persisted adminSections correctly, but nothing ever
 * actually checked it server-side -- authorize('admin','super_admin') let
 * every admin/super_admin through regardless, so the section checkboxes
 * were UI-only. A staff account granted only "Members" could reach every
 * other admin module's API directly. This closes that gap.
 *
 * Looks the user up fresh (not a JWT claim) so a permission change takes
 * effect immediately, without the affected admin needing to log back in.
 * Must run after `authenticate`.
 */
export const requireSection = (section: AdminSection) => {
  // Errors thrown from an async Express middleware never reach the error
  // handler on their own -- Express doesn't await middleware, so a
  // rejected promise here becomes an unhandled rejection and crashes the
  // process instead of producing a 403. Caught explicitly and passed to
  // next() rather than relying on catchAsync at every call site.
  return (req: Request, res: Response, next: NextFunction): void => {
    void (async () => {
      try {
        if (!req.user) {
          throw new AuthenticationError('User not authenticated');
        }
        if (req.user.role === 'super_admin') {
          next();
          return;
        }

        const user = await User.findById(req.user.userId).select('adminSections');
        if (!user || !(user.adminSections ?? []).includes(section)) {
          throw new AuthorizationError(`Your account doesn't have access to this section`);
        }
        next();
      } catch (error) {
        next(error);
      }
    })();
  };
};

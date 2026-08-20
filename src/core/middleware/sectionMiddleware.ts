import { Request, Response, NextFunction } from 'express';
import { User } from '@/modules/users/schemas/User.schema';
import { AdminSection, canAccessSection } from '@/core/auth/adminAccess';
import { AuthenticationError, AuthorizationError } from '@/core/errors/AppError';

/**
 * The section vocabulary lives in core/auth/adminAccess.ts alongside the
 * roles that grant it. Re-exported here because every admin route file
 * already imports `requireSection` from this module, and the type reads
 * naturally next to it.
 */
export type { AdminSection };

/**
 * Gates an admin route to a specific section -- the authoritative check,
 * and the only thing that actually stops a request. Hiding a nav item in
 * the portal is a courtesy to the person using it, not a control: a
 * Content Manager calling the subscriptions API directly still lands here
 * and still gets a 403.
 *
 * What counts as "holding" a section is resolveAdminSections(): a super
 * admin holds everything, an account whose sections have never been
 * customised inherits its adminRole's defaults, and an explicit list --
 * including a deliberately empty one -- is honoured exactly as stored.
 *
 * The invite/edit form persisted these grants correctly long before
 * anything checked them server-side, so a staff account granted only
 * "Members" could reach every other admin module's API directly. This
 * closes that gap.
 *
 * Looks the user up fresh (not a JWT claim) so a permission or role change
 * takes effect on the very next request, without the affected admin
 * needing to log back in. Must run after `authenticate`.
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

        const user = await User.findById(req.user.userId).select('role adminRole adminSections');
        if (!user || !canAccessSection(user, section)) {
          throw new AuthorizationError(`Your account doesn't have access to this section`);
        }
        next();
      } catch (error) {
        next(error);
      }
    })();
  };
};

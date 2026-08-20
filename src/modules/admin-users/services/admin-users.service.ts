import crypto from 'crypto';
import { User, IUser } from '@/modules/users/schemas/User.schema';
import { authRepository } from '@/modules/auth/repositories/auth.repository';
import { EmailService } from '@/core/email/EmailService';
import {
  AdminRole,
  AdminSection,
  ADMIN_ROLE_LABELS,
  hasCustomSections,
  resolveAdminRole,
  resolveAdminSections,
  toBackendRole,
} from '@/core/auth/adminAccess';
import { NotFoundError, ValidationError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

function initialsOf(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

function adminIdOf(user: IUser): string {
  const prefix = user.role === 'super_admin' ? 'PBT-A-' : 'PBT-S-';
  return `${prefix}${user._id.toString().slice(-4).toUpperCase()}`;
}

function toAdminAccount(user: IUser) {
  return {
    id: user._id.toString(),
    adminId: adminIdOf(user),
    fullName: user.fullName,
    initials: initialsOf(user.fullName),
    email: user.email,
    // Canonical constant, never the label -- the portal maps it to display
    // text itself, so the two repos share one role vocabulary rather than
    // the frontend inventing a parallel one. roleLabel rides along so the
    // mapping is defined next to the value it describes.
    role: resolveAdminRole(user) ?? 'ADMIN',
    roleLabel: ADMIN_ROLE_LABELS[resolveAdminRole(user) ?? 'ADMIN'],
    // Effective access, not the raw column: an account that has never been
    // customised shows its role's defaults, which is what it can actually
    // reach. sectionsCustomised is how the editor tells "inheriting the
    // defaults" apart from "explicitly set to exactly this".
    sections: resolveAdminSections(user),
    sectionsCustomised: hasCustomSections(user),
    // No real invite flow exists yet -- emailVerified is the closest real
    // signal for "has this person ever actually signed in and set a
    // password", so it stands in for Active vs Invited rather than a
    // fabricated separate status field.
    status: (user.emailVerified ? 'Active' : 'Invited') as 'Active' | 'Invited',
  };
}

interface ListParams {
  role: AdminRole | 'All';
  search?: string;
  page: number;
  limit: number;
}

export class AdminUsersService {
  /**
   * Real tally over admin/super_admin User documents. `roleChangesCount` is
   * honestly 0 -- there's no role-change audit log yet, so nothing has been
   * "counted" rather than a fabricated placeholder number.
   */
  async getStats() {
    const [superAdminsCount, staffAccountsCount, invitedNotActiveCount] = await Promise.all([
      User.countDocuments({ role: 'super_admin' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: { $in: ['admin', 'super_admin'] }, emailVerified: false }),
    ]);

    return { superAdminsCount, staffAccountsCount, invitedNotActiveCount, roleChangesCount: 0 };
  }

  async listAccounts({ role, search, page, limit }: ListParams) {
    const filter: Record<string, unknown> = { role: { $in: ['admin', 'super_admin'] } };
    const q = search?.trim();
    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    const allMatching = await User.find(filter).sort({ createdAt: -1 });
    const accounts = allMatching.map(toAdminAccount);
    const filtered = role === 'All' ? accounts : accounts.filter((a) => a.role === role);

    const totalItems = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, totalItems };
  }

  async getAccountById(id: string) {
    const user = await User.findOne({ _id: id, role: { $in: ['admin', 'super_admin'] } });
    if (!user) throw new NotFoundError('Admin account not found');
    return toAdminAccount(user);
  }

  /**
   * Creates a real admin/super_admin User with a random, never-disclosed
   * password and emails the same account-setup link used for members --
   * see EmailService.sendAccountSetupEmail. Sending is best-effort (never
   * throws on missing SMTP config), so the account is always created even
   * when no email credentials are configured in this environment.
   */
  async createAccount(data: { fullName: string; email: string; role: AdminRole; sections?: AdminSection[] }) {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new ValidationError('An account with this email already exists', ['Email is already in use']);
    }

    const temporaryPassword = crypto.randomBytes(16).toString('hex');
    const user = await User.create({
      email: data.email.toLowerCase(),
      password: temporaryPassword,
      fullName: data.fullName,
      role: toBackendRole(data.role),
      adminRole: data.role,
      // Left absent unless the caller genuinely chose a set, so the account
      // inherits its role's defaults. The controller used to coerce a
      // missing `sections` to `[]` here, which reads as a deliberate
      // lockout and left anything created without the invite form -- a
      // script, a seed, a direct API call -- with an empty portal.
      adminSections: data.role === 'SUPER_ADMIN' ? undefined : data.sections,
      emailVerified: false,
    });

    const setupToken = await authRepository.setPasswordResetToken(user._id.toString());
    EmailService.sendAccountSetupEmail(user.email, user.fullName, setupToken).catch(() => {});

    logger.info(`Admin invited new admin-portal account: ${user.email} (${data.role})`);
    return this.getAccountById(user._id.toString());
  }

  /**
   * `sections: []` is a real instruction here -- a super admin taking every
   * section away -- and is stored as such. `resetSectionsToRoleDefaults`
   * is how they undo that: it clears the column back to absent so the role's
   * defaults apply again, which no value of `sections` could express.
   */
  async updateAccount(
    id: string,
    data: { fullName?: string; role?: AdminRole; sections?: AdminSection[]; resetSectionsToRoleDefaults?: boolean }
  ) {
    const user = await User.findOne({ _id: id, role: { $in: ['admin', 'super_admin'] } });
    if (!user) throw new NotFoundError('Admin account not found');

    if (data.fullName !== undefined) user.fullName = data.fullName;
    if (data.role !== undefined) {
      user.role = toBackendRole(data.role);
      user.adminRole = data.role;
      // A Super Admin holds everything regardless, so a stored section list
      // would be dead data that reappears misleadingly if they're demoted.
      if (data.role === 'SUPER_ADMIN') user.adminSections = undefined;
    }
    if (data.resetSectionsToRoleDefaults) {
      user.adminSections = undefined;
    } else if (data.sections !== undefined && user.role !== 'super_admin') {
      user.adminSections = data.sections;
    }

    await user.save();
    return this.getAccountById(id);
  }

  async deleteAccount(id: string) {
    const user = await User.findOne({ _id: id, role: { $in: ['admin', 'super_admin'] } });
    if (!user) throw new NotFoundError('Admin account not found');
    if (user.role === 'super_admin') {
      throw new ValidationError('Super Admin accounts can\'t be removed here', ['Change their role first, or remove them directly in the database']);
    }

    user.deletedAt = new Date();
    user.isActive = false;
    await user.save();
    logger.info(`Admin account removed: ${user.email}`);
    return { deleted: true };
  }
}

export const adminUsersService = new AdminUsersService();

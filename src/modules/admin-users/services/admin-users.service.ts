import crypto from 'crypto';
import { User, IUser } from '@/modules/users/schemas/User.schema';
import { authRepository } from '@/modules/auth/repositories/auth.repository';
import { EmailService } from '@/core/email/EmailService';
import { NotFoundError, ValidationError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

type AdminRole = 'Super Admin' | 'Admin' | 'Content Manager' | 'Community Moderator' | 'Support Staff';
type BackendAdminRole = 'admin' | 'super_admin';

/** `authorize()` only ever checks this coarse value -- the fine-grained
 * label above is a display/section-gating hint stored on the same user. */
function toBackendRole(role: AdminRole): BackendAdminRole {
  return role === 'Super Admin' ? 'super_admin' : 'admin';
}

function displayRole(user: IUser): AdminRole {
  if (user.role === 'super_admin') return 'Super Admin';
  return user.adminRole ?? 'Admin';
}

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
    role: displayRole(user),
    sections: user.role === 'super_admin' ? [] : (user.adminSections ?? []),
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
  async createAccount(data: { fullName: string; email: string; role: AdminRole; sections: string[] }) {
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
      adminSections: data.role === 'Super Admin' ? undefined : data.sections,
      emailVerified: false,
    });

    const setupToken = await authRepository.setPasswordResetToken(user._id.toString());
    await EmailService.sendAccountSetupEmail(user.email, user.fullName, setupToken);

    logger.info(`Admin invited new admin-portal account: ${user.email} (${data.role})`);
    return this.getAccountById(user._id.toString());
  }

  async updateAccount(id: string, data: { fullName?: string; role?: AdminRole; sections?: string[] }) {
    const user = await User.findOne({ _id: id, role: { $in: ['admin', 'super_admin'] } });
    if (!user) throw new NotFoundError('Admin account not found');

    if (data.fullName !== undefined) user.fullName = data.fullName;
    if (data.role !== undefined) {
      user.role = toBackendRole(data.role);
      user.adminRole = data.role;
      if (data.role === 'Super Admin') user.adminSections = undefined;
    }
    if (data.sections !== undefined && user.role !== 'super_admin') {
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

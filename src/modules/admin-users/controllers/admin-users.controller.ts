import { Request, Response } from 'express';
import { adminUsersService } from '@/modules/admin-users/services/admin-users.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';

type AdminRole = 'Super Admin' | 'Admin' | 'Content Manager' | 'Community Moderator' | 'Support Staff';

export class AdminUsersController {
  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await adminUsersService.getStats();
    ResponseHandler.ok(res, 'Admin users stats retrieved successfully', stats);
  }

  async listAccounts(req: Request, res: Response): Promise<void> {
    const { page, limit } = PaginationHelper.parse({ page: req.query.page as string, limit: req.query.limit as string });
    const role = (req.query.role as AdminRole | 'All') || 'All';
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const { items, totalItems } = await adminUsersService.listAccounts({ role, search, page, limit });
    ResponseHandler.paginated(res, 200, 'Admin accounts retrieved successfully', items, PaginationHelper.createMeta(page, limit, totalItems));
  }

  async getAccountById(req: Request, res: Response): Promise<void> {
    const account = await adminUsersService.getAccountById(req.params.accountId);
    ResponseHandler.ok(res, 'Admin account retrieved successfully', account);
  }

  async createAccount(req: Request, res: Response): Promise<void> {
    const { fullName, email, role, sections } = req.body as { fullName: string; email: string; role: AdminRole; sections: string[] };
    const account = await adminUsersService.createAccount({ fullName, email, role, sections: sections ?? [] });
    ResponseHandler.created(res, 'Admin account invited successfully', account);
  }

  async updateAccount(req: Request, res: Response): Promise<void> {
    const { fullName, role, sections } = req.body as { fullName?: string; role?: AdminRole; sections?: string[] };
    const account = await adminUsersService.updateAccount(req.params.accountId, { fullName, role, sections });
    ResponseHandler.ok(res, 'Admin account updated successfully', account);
  }

  async deleteAccount(req: Request, res: Response): Promise<void> {
    const result = await adminUsersService.deleteAccount(req.params.accountId);
    ResponseHandler.ok(res, 'Admin account removed', result);
  }
}

export const adminUsersController = new AdminUsersController();

import { Request, Response } from 'express';
import { adminUsersService } from '@/modules/admin-users/services/admin-users.service';
import {
  createAdminAccountSchema,
  updateAdminAccountSchema,
  listAdminAccountsQuerySchema,
} from '@/modules/admin-users/validators/admin-users.validators';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';

export class AdminUsersController {
  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await adminUsersService.getStats();
    ResponseHandler.ok(res, 'Admin users stats retrieved successfully', stats);
  }

  async listAccounts(req: Request, res: Response): Promise<void> {
    const query = listAdminAccountsQuerySchema.parse(req.query);

    const { items, totalItems } = await adminUsersService.listAccounts(query);
    ResponseHandler.paginated(
      res,
      200,
      'Admin accounts retrieved successfully',
      items,
      PaginationHelper.createMeta(query.page, query.limit, totalItems)
    );
  }

  async getAccountById(req: Request, res: Response): Promise<void> {
    const account = await adminUsersService.getAccountById(req.params.accountId);
    ResponseHandler.ok(res, 'Admin account retrieved successfully', account);
  }

  async createAccount(req: Request, res: Response): Promise<void> {
    // `sections` is passed through exactly as given, undefined included:
    // omitting it means the account inherits its role's defaults, and
    // coercing it to `[]` here (as this did) turned that into a lockout.
    const input = createAdminAccountSchema.parse(req.body);
    const account = await adminUsersService.createAccount(input);
    ResponseHandler.created(res, 'Admin account invited successfully', account);
  }

  async updateAccount(req: Request, res: Response): Promise<void> {
    const input = updateAdminAccountSchema.parse(req.body);
    const account = await adminUsersService.updateAccount(req.params.accountId, input);
    ResponseHandler.ok(res, 'Admin account updated successfully', account);
  }

  async deleteAccount(req: Request, res: Response): Promise<void> {
    const result = await adminUsersService.deleteAccount(req.params.accountId);
    ResponseHandler.ok(res, 'Admin account removed', result);
  }
}

export const adminUsersController = new AdminUsersController();

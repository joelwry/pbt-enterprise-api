import { Request, Response } from 'express';
import { adminMembersService, type AdminActor } from '@/modules/admin-members/services/admin-members.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';

type FrontendTier = 'Pathway' | 'Plus' | 'Mentorship';

function actorOf(req: Request): AdminActor {
  return {
    adminId: req.user!.userId,
    ipAddress: req.ip ?? 'unknown',
    userAgent: req.get('user-agent') ?? 'unknown',
  };
}

export class AdminMembersController {
  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await adminMembersService.getStats();
    ResponseHandler.ok(res, 'Member stats retrieved successfully', stats);
  }

  async listMembers(req: Request, res: Response): Promise<void> {
    const { page, limit } = PaginationHelper.parse({ page: req.query.page as string, limit: req.query.limit as string });
    const tier = (req.query.tier as FrontendTier | 'All') || 'All';
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const { items, totalItems } = await adminMembersService.listMembers({ tier, search, page, limit });
    ResponseHandler.paginated(res, 200, 'Members retrieved successfully', items, PaginationHelper.createMeta(page, limit, totalItems));
  }

  async getMemberById(req: Request, res: Response): Promise<void> {
    const member = await adminMembersService.getMemberById(req.params.memberId);
    ResponseHandler.ok(res, 'Member retrieved successfully', member);
  }

  async getMemberBilling(req: Request, res: Response): Promise<void> {
    const { page, limit } = PaginationHelper.parse({ page: req.query.page as string, limit: req.query.limit as string });
    const { items, totalItems } = await adminMembersService.getMemberBilling(req.params.memberId, page, limit);
    ResponseHandler.paginated(res, 200, 'Billing history retrieved successfully', items, PaginationHelper.createMeta(page, limit, totalItems));
  }

  async getMemberLearningProgress(req: Request, res: Response): Promise<void> {
    const progress = await adminMembersService.getMemberLearningProgress(req.params.memberId);
    ResponseHandler.ok(res, 'Learning progress retrieved successfully', progress);
  }

  async createMember(req: Request, res: Response): Promise<void> {
    const { fullName, email, tier } = req.body as { fullName: string; email: string; tier: FrontendTier };
    const member = await adminMembersService.createMember({ fullName, email, tier });
    ResponseHandler.created(res, 'Member created successfully', member);
  }

  async updateMember(req: Request, res: Response): Promise<void> {
    const { fullName, phone, location, assignedLeaderId } = req.body as {
      fullName?: string;
      phone?: string;
      location?: string;
      assignedLeaderId?: string | null;
    };
    const member = await adminMembersService.updateMember(req.params.memberId, { fullName, phone, location, assignedLeaderId });
    ResponseHandler.ok(res, 'Member updated successfully', member);
  }

  async changeTier(req: Request, res: Response): Promise<void> {
    const { tier } = req.body as { tier: FrontendTier };
    const member = await adminMembersService.changeTier(req.params.memberId, tier);
    ResponseHandler.ok(res, 'Membership tier updated successfully', member);
  }

  async setPaused(req: Request, res: Response): Promise<void> {
    const { paused } = req.body as { paused: boolean };
    const member = await adminMembersService.setPaused(req.params.memberId, paused);
    ResponseHandler.ok(res, paused ? 'Membership paused' : 'Membership resumed', member);
  }

  async deactivateAccount(req: Request, res: Response): Promise<void> {
    await adminMembersService.setPaused(req.params.memberId, true);
    ResponseHandler.ok(res, 'Account deactivated', { deactivated: true });
  }

  async resendWelcomeEmail(req: Request, res: Response): Promise<void> {
    const result = await adminMembersService.resendWelcomeEmail(req.params.memberId, actorOf(req));
    ResponseHandler.ok(res, result.sent ? 'Invitation email sent' : 'Invitation email could not be sent', result);
  }

  async createSetupLink(req: Request, res: Response): Promise<void> {
    const result = await adminMembersService.createSetupLink(req.params.memberId, actorOf(req));
    ResponseHandler.ok(res, 'Setup link created', result);
  }

  async deleteMember(req: Request, res: Response): Promise<void> {
    const result = await adminMembersService.deleteMember(req.params.memberId);
    ResponseHandler.ok(res, 'Member deleted', result);
  }
}

export const adminMembersController = new AdminMembersController();

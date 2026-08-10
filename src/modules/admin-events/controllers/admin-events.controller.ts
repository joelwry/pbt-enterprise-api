import { Request, Response } from 'express';
import { adminEventsService } from '@/modules/admin-events/services/admin-events.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';

export class AdminEventsController {
  async listEvents(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10);
    const tab = (req.query.tab as string) ?? 'Upcoming';
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const { items, totalItems } = await adminEventsService.listEvents({ tab: tab as any, search, page, limit });
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    ResponseHandler.paginated(res, 200, 'Events retrieved', items, {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    });
  }

  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await adminEventsService.getStats();
    ResponseHandler.ok(res, 'Event stats retrieved', stats);
  }

  async getEventById(req: Request, res: Response): Promise<void> {
    const event = await adminEventsService.getEventById(req.params.eventId);
    ResponseHandler.ok(res, 'Event retrieved', event);
  }

  async createEvent(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }
    const event = await adminEventsService.createEvent(req.user.userId, req.body);
    ResponseHandler.created(res, 'Event created', event);
  }

  async updateEvent(req: Request, res: Response): Promise<void> {
    const event = await adminEventsService.updateEvent(req.params.eventId, req.body);
    ResponseHandler.ok(res, 'Event updated', event);
  }

  async cancelEvent(req: Request, res: Response): Promise<void> {
    const event = await adminEventsService.cancelEvent(req.params.eventId);
    ResponseHandler.ok(res, 'Event cancelled', event);
  }

  async deleteEvent(req: Request, res: Response): Promise<void> {
    await adminEventsService.deleteEvent(req.params.eventId);
    ResponseHandler.ok(res, 'Event deleted', {});
  }
}

export const adminEventsController = new AdminEventsController();

import { Request, Response } from 'express';
import { Event } from '@/modules/events/schemas/Event.schema';
import { eventsService } from '@/modules/events/services/events.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';
import logger from '@/core/logger/logger';

export class EventsController {
  /**
   * Get upcoming events
   * GET /api/v1/events/upcoming
   */
  async getUpcomingEvents(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { page = 1, limit = 20 } = req.query;
    const query = PaginationHelper.parse({ page: page as string, limit: limit as string });

    const now = new Date();
    const filter = { date: { $gte: now }, isActive: true };
    const [events, total] = await Promise.all([
      Event.find(filter).skip(query.skip).limit(query.limit).sort({ date: 1 }),
      Event.countDocuments(filter),
    ]);

    const items = events.map((e) => eventsService.toMemberEventItem(e, req.user!.userId));
    const pagination = PaginationHelper.createMeta(query.page, query.limit, total);
    ResponseHandler.paginated(res, 200, 'Upcoming events retrieved', items, pagination);
  }

  /**
   * Get past events
   * GET /api/v1/events/past
   */
  async getPastEvents(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { page = 1, limit = 20 } = req.query;
    const query = PaginationHelper.parse({ page: page as string, limit: limit as string });

    const now = new Date();
    const filter = { date: { $lt: now }, isActive: true };
    const [events, total] = await Promise.all([
      Event.find(filter).skip(query.skip).limit(query.limit).sort({ date: -1 }),
      Event.countDocuments(filter),
    ]);

    const items = events.map((e) => eventsService.toMemberEventItem(e, req.user!.userId));
    const pagination = PaginationHelper.createMeta(query.page, query.limit, total);
    ResponseHandler.paginated(res, 200, 'Past events retrieved', items, pagination);
  }

  /**
   * Get events the current member has RSVP'd to (any date)
   * GET /api/v1/events/my-rsvps
   */
  async getMyRsvpEvents(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { page = 1, limit = 20 } = req.query;
    const query = PaginationHelper.parse({ page: page as string, limit: limit as string });

    const filter = { rsvps: req.user.userId, isActive: true };
    const [events, total] = await Promise.all([
      Event.find(filter).skip(query.skip).limit(query.limit).sort({ date: 1 }),
      Event.countDocuments(filter),
    ]);

    const items = events.map((e) => eventsService.toMemberEventItem(e, req.user!.userId));
    const pagination = PaginationHelper.createMeta(query.page, query.limit, total);
    ResponseHandler.paginated(res, 200, 'My RSVPs retrieved', items, pagination);
  }

  /**
   * Get event by ID
   * GET /api/v1/events/:eventId
   */
  async getEventById(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { eventId } = req.params;
    const event = await Event.findById(eventId);

    if (!event) {
      ResponseHandler.notFound(res, 'Event not found');
      return;
    }

    ResponseHandler.ok(res, 'Event retrieved', eventsService.toMemberEventItem(event, req.user.userId));
  }

  /**
   * All events in a given calendar month -- past or future, deliberately not
   * time-gated the way RSVP-ability is. The calendar is a browsing view, not
   * an action; a member should be able to look back at a past month same as
   * scanning ahead, exactly like flipping the page on a real wall calendar.
   * GET /api/v1/events/calendar?year=&month=
   */
  async getCalendarMonth(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const year = parseInt(String(req.query.year), 10);
    const month = parseInt(String(req.query.month), 10); // 1-12

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const events = await Event.find({ date: { $gte: start, $lt: end }, isActive: true }).sort({ date: 1 });
    const items = events.map((e) => eventsService.toMemberEventItem(e, req.user!.userId));
    ResponseHandler.ok(res, 'Calendar month retrieved', items);
  }

  /**
   * RSVP to event
   * POST /api/v1/events/:eventId/rsvp
   */
  async rsvpEvent(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { eventId } = req.params;
    const { guestCount, notes } = req.body;

    const event = await eventsService.rsvp(req.user.userId, eventId, guestCount, notes);
    ResponseHandler.ok(res, 'RSVP successful', eventsService.toMemberEventItem(event, req.user.userId));
  }

  /**
   * Cancel RSVP
   * DELETE /api/v1/events/:eventId/rsvp
   */
  async cancelRsvp(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { eventId } = req.params;
    const event = await eventsService.cancelRsvp(req.user.userId, eventId);
    logger.info(`RSVP cancelled: ${req.user.userId} - ${eventId}`);
    ResponseHandler.ok(res, 'RSVP cancelled', eventsService.toMemberEventItem(event, req.user.userId));
  }
}

export const eventsController = new EventsController();

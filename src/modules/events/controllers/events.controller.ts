import { Request, Response } from 'express';
import { Event } from '@/modules/events/schemas/Event.schema';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';
import logger from '@/core/logger/logger';

export class EventsController {
  /**
   * Get upcoming events
   * GET /api/v1/events/upcoming
   */
  async getUpcomingEvents(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 20 } = req.query;
    const query = PaginationHelper.parse({ page: page as string, limit: limit as string });

    const now = new Date();
    const events = await Event.find({
      date: { $gte: now },
      isActive: true,
    })
      .skip(query.skip)
      .limit(query.limit)
      .sort({ date: 1 });

    const total = await Event.countDocuments({
      date: { $gte: now },
      isActive: true,
    });

    const pagination = PaginationHelper.createMeta(query.page, query.limit, total);
    ResponseHandler.paginated(res, 200, 'Upcoming events retrieved', events, pagination);
  }

  /**
   * Get past events
   * GET /api/v1/events/past
   */
  async getPastEvents(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 20 } = req.query;
    const query = PaginationHelper.parse({ page: page as string, limit: limit as string });

    const now = new Date();
    const events = await Event.find({
      date: { $lt: now },
      isActive: true,
    })
      .skip(query.skip)
      .limit(query.limit)
      .sort({ date: -1 });

    const total = await Event.countDocuments({
      date: { $lt: now },
      isActive: true,
    });

    const pagination = PaginationHelper.createMeta(query.page, query.limit, total);
    ResponseHandler.paginated(res, 200, 'Past events retrieved', events, pagination);
  }

  /**
   * Get event by ID
   * GET /api/v1/events/:eventId
   */
  async getEventById(req: Request, res: Response): Promise<void> {
    const { eventId } = req.params;

    const event = await Event.findById(eventId).populate('createdBy', 'fullName email');

    if (!event) {
      ResponseHandler.notFound(res, 'Event not found');
      return;
    }

    ResponseHandler.ok(res, 'Event retrieved', event);
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

    const event = await Event.findById(eventId);

    if (!event) {
      ResponseHandler.notFound(res, 'Event not found');
      return;
    }

    if (!event.rsvps.includes(req.user.userId as any)) {
      event.rsvps.push(req.user.userId as any);
    }

    if (!event.rsvpDetails) {
      event.rsvpDetails = new Map();
    }

    event.rsvpDetails.set(req.user.userId, {
      guestCount,
      notes,
      createdAt: new Date(),
    });

    await event.save();

    logger.info(`RSVP created: ${req.user.userId} - ${eventId}`);
    ResponseHandler.ok(res, 'RSVP successful', event);
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

    const event = await Event.findByIdAndUpdate(
      eventId,
      {
        $pull: { rsvps: req.user.userId },
      },
      { new: true }
    );

    if (!event) {
      ResponseHandler.notFound(res, 'Event not found');
      return;
    }

    logger.info(`RSVP cancelled: ${req.user.userId} - ${eventId}`);
    ResponseHandler.ok(res, 'RSVP cancelled', event);
  }
}

export const eventsController = new EventsController();

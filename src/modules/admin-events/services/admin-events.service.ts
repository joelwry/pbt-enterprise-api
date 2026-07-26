import { Event, IEvent, EventCategory, EventMembershipTier } from '@/modules/events/schemas/Event.schema';
import { buildTimeLabel } from '@/modules/events/services/events.service';
import { NotFoundError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

export type AdminEventStatus = 'Upcoming' | 'Completed' | 'Cancelled';

function statusOf(event: IEvent): AdminEventStatus {
  if (!event.isActive) return 'Cancelled';
  return event.date >= new Date() ? 'Upcoming' : 'Completed';
}

function toAdminEvent(event: IEvent) {
  return {
    id: event._id,
    title: event.title,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    category: event.category,
    rsvpCount: event.rsvps.length,
    capacity: event.capacity,
    status: statusOf(event),
    location: event.location,
    description: event.description,
    requiredTier: event.requiredTier,
  };
}

export interface AdminEventInput {
  title: string;
  category: EventCategory;
  capacity: number;
  date: string | Date;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  requiredTier: EventMembershipTier;
}

export class AdminEventsService {
  /** Flat, paginated, searchable, tab-filterable list for the admin Event Management screen. */
  async listEvents(query: {
    tab: 'Upcoming' | 'Past' | EventCategory;
    search?: string;
    page: number;
    limit: number;
  }) {
    const { tab, search, page, limit } = query;
    const now = new Date();

    const filter: Record<string, unknown> = {};
    if (tab === 'Upcoming') filter.date = { $gte: now };
    else if (tab === 'Past') filter.date = { $lt: now };
    else filter.category = tab;

    if (search?.trim()) filter.title = { $regex: search.trim(), $options: 'i' };

    const [events, totalItems] = await Promise.all([
      Event.find(filter)
        .sort({ date: tab === 'Past' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Event.countDocuments(filter),
    ]);

    return { items: events.map(toAdminEvent), totalItems };
  }

  async getStats() {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [upcomingCount, allUpcoming, inPersonUpcoming, completedThisYear] = await Promise.all([
      Event.countDocuments({ date: { $gte: now }, isActive: true }),
      Event.find({ date: { $gte: now }, isActive: true }).select('rsvps'),
      Event.find({ date: { $gte: now }, isActive: true, category: 'In-Person' }).sort({ date: 1 }).select('date'),
      Event.countDocuments({ date: { $gte: yearStart, $lt: now }, isActive: true }),
    ]);

    const totalRsvps = allUpcoming.reduce((sum, e) => sum + e.rsvps.length, 0);
    const nextInPerson = inPersonUpcoming[0];

    return {
      upcomingCount,
      totalRsvps,
      inPersonCount: inPersonUpcoming.length,
      inPersonNextLabel: nextInPerson
        ? `Next ${nextInPerson.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
        : 'None scheduled',
      completedCount: completedThisYear,
      yearLabel: String(now.getFullYear()),
    };
  }

  async getEventById(eventId: string) {
    const event = await Event.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');
    return toAdminEvent(event);
  }

  async createEvent(userId: string, input: AdminEventInput) {
    const event = await Event.create({
      title: input.title,
      description: input.description,
      date: new Date(input.date),
      startTime: input.startTime,
      endTime: input.endTime,
      timeLabel: buildTimeLabel(input.startTime, input.endTime),
      location: input.location,
      category: input.category,
      capacity: input.capacity,
      requiredTier: input.requiredTier,
      createdBy: userId,
    });
    logger.info('Event created', { eventId: event._id });
    return toAdminEvent(event);
  }

  async updateEvent(eventId: string, input: Partial<AdminEventInput>) {
    const update: Record<string, unknown> = { ...input };
    if (input.date !== undefined) update.date = new Date(input.date);
    if (input.startTime !== undefined || input.endTime !== undefined) {
      const existing = await Event.findById(eventId);
      if (!existing) throw new NotFoundError('Event not found');
      update.timeLabel = buildTimeLabel(input.startTime ?? existing.startTime, input.endTime ?? existing.endTime);
    }

    const event = await Event.findByIdAndUpdate(eventId, update, { new: true });
    if (!event) throw new NotFoundError('Event not found');
    return toAdminEvent(event);
  }

  /** Deactivates without deleting — RSVP'd members keep their record, matches the admin UI's own copy ("Cancel Event" vs "Delete"). */
  async cancelEvent(eventId: string) {
    const event = await Event.findByIdAndUpdate(eventId, { isActive: false }, { new: true });
    if (!event) throw new NotFoundError('Event not found');
    logger.info('Event cancelled', { eventId });
    return toAdminEvent(event);
  }

  async deleteEvent(eventId: string) {
    const event = await Event.findByIdAndUpdate(eventId, { deletedAt: new Date() }, { new: true });
    if (!event) throw new NotFoundError('Event not found');
    logger.info('Event soft-deleted', { eventId });
  }
}

export const adminEventsService = new AdminEventsService();

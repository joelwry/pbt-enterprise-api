import { Event, IEvent, EventMembershipTier } from '@/modules/events/schemas/Event.schema';
import { subscriptionService } from '@/modules/subscriptions/services/subscription.service';
import { NotFoundError, AuthorizationError, ValidationError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

/** "18:00" -> "6:00 PM" */
function to12Hour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function buildTimeLabel(startTime: string, endTime: string): string {
  return `${to12Hour(startTime)} – ${to12Hour(endTime)}`;
}

export class EventsService {
  /**
   * Maps a raw Event document to the member-facing shape, resolving the
   * two things that are specific to the requesting member: whether they've
   * RSVP'd, and their RSVP details if so. Both live on the shared document
   * (rsvps[], rsvpDetails Map) so they can't be projected generically.
   */
  toMemberEventItem(event: IEvent, userId: string) {
    const details = event.rsvpDetails?.get(userId);
    return {
      id: event._id,
      date: event.date,
      title: event.title,
      timeLabel: event.timeLabel,
      location: event.location,
      category: event.category,
      requiredTier: event.requiredTier,
      rsvped: event.rsvps.some((id) => id.toString() === userId),
      rsvpDetails: details ? { guestCount: details.guestCount, notes: details.notes } : undefined,
      photoGalleryUrl: event.photoGalleryUrl,
      recordingUrl: event.recordingUrl,
      slidesUrl: event.slidesUrl,
    };
  }

  /** Every lesson-style access check has two gates; events only need the Membership Gate — there's no release-date lock on an event the way there is on a lesson. */
  async canRsvp(userId: string, requiredTier: EventMembershipTier): Promise<boolean> {
    return subscriptionService.canAccessTier(userId, requiredTier);
  }

  async rsvp(userId: string, eventId: string, guestCount: number, notes: string): Promise<IEvent> {
    const event = await Event.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');

    const canAccess = await this.canRsvp(userId, event.requiredTier);
    if (!canAccess) {
      throw new AuthorizationError(`Requires ${event.requiredTier} membership or higher`);
    }

    const alreadyIn = event.rsvps.some((id) => id.toString() === userId);
    if (!alreadyIn && event.rsvps.length >= event.capacity) {
      throw new ValidationError('This event is full', ['No spots remaining for this event']);
    }

    const parsedGuestCount = Number(guestCount);
    if (!Number.isFinite(parsedGuestCount) || parsedGuestCount < 1 || parsedGuestCount > 5) {
      throw new ValidationError('Invalid guest count', ['guestCount must be between 1 and 5']);
    }

    if (!alreadyIn) {
      event.rsvps.push(userId as any);
    }

    if (!event.rsvpDetails) {
      event.rsvpDetails = new Map();
    }
    event.rsvpDetails.set(userId, {
      guestCount: parsedGuestCount,
      notes: typeof notes === 'string' ? notes.slice(0, 300) : '',
      createdAt: new Date(),
    });

    await event.save();
    logger.info(`RSVP created: ${userId} - ${eventId}`);
    return event;
  }

  async cancelRsvp(userId: string, eventId: string): Promise<IEvent> {
    const event = await Event.findByIdAndUpdate(
      eventId,
      {
        $pull: { rsvps: userId },
        $unset: { [`rsvpDetails.${userId}`]: '' },
      },
      { new: true }
    );
    if (!event) throw new NotFoundError('Event not found');
    logger.info(`RSVP cancelled: ${userId} - ${eventId}`);
    return event;
  }
}

export const eventsService = new EventsService();

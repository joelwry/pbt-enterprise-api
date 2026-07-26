import { Router } from 'express';
import { eventsController } from '@/modules/events/controllers/events.controller';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { authenticate } from '@/core/middleware/authMiddleware';

const router = Router();

/**
 * Events Routes — all require auth now: every response needs the requesting
 * member's own rsvped/rsvpDetails resolved against the shared event document.
 */
router.use(authenticate);

// "my-rsvps" must be registered before "/:eventId" so it isn't swallowed as an id.
router.get('/upcoming', catchAsync((req, res) => eventsController.getUpcomingEvents(req, res)));
router.get('/past', catchAsync((req, res) => eventsController.getPastEvents(req, res)));
router.get('/my-rsvps', catchAsync((req, res) => eventsController.getMyRsvpEvents(req, res)));
router.get('/:eventId', catchAsync((req, res) => eventsController.getEventById(req, res)));

router.post('/:eventId/rsvp', catchAsync((req, res) => eventsController.rsvpEvent(req, res)));
router.delete('/:eventId/rsvp', catchAsync((req, res) => eventsController.cancelRsvp(req, res)));

export default router;

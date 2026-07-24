import { Router } from 'express';
import { eventsController } from '@/modules/events/controllers/events.controller';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { authenticate, optionalAuth } from '@/core/middleware/authMiddleware';

const router = Router();

/**
 * Events Routes
 */

// Public routes
router.get('/upcoming', catchAsync((req, res) => eventsController.getUpcomingEvents(req, res)));
router.get('/past', catchAsync((req, res) => eventsController.getPastEvents(req, res)));
router.get('/:eventId', catchAsync((req, res) => eventsController.getEventById(req, res)));

// Protected routes
router.post('/:eventId/rsvp', authenticate, catchAsync((req, res) => eventsController.rsvpEvent(req, res)));
router.delete('/:eventId/rsvp', authenticate, catchAsync((req, res) => eventsController.cancelRsvp(req, res)));

export default router;

import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { adminEventsController as c } from '@/modules/admin-events/controllers/admin-events.controller';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'));

// 'stats' registered before '/:eventId' so it isn't swallowed as an id.
router.get('/stats', catchAsync((req, res) => c.getStats(req, res)));
router.get('/', catchAsync((req, res) => c.listEvents(req, res)));
router.post('/', catchAsync((req, res) => c.createEvent(req, res)));
router.get('/:eventId', catchAsync((req, res) => c.getEventById(req, res)));
router.patch('/:eventId', catchAsync((req, res) => c.updateEvent(req, res)));
router.post('/:eventId/cancel', catchAsync((req, res) => c.cancelEvent(req, res)));
router.delete('/:eventId', catchAsync((req, res) => c.deleteEvent(req, res)));

export default router;

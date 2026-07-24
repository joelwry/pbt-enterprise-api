import { Router } from 'express';
import { authenticate } from '@/core/middleware/authMiddleware';
import JourneyController from '../controllers/journey.controller';

const router = Router();

router.use(authenticate);

router.get('/', JourneyController.getUserJourneys);
router.post('/', JourneyController.createJourney);
router.get('/active', JourneyController.getActiveJourneys);
router.get('/:journeyId', JourneyController.getJourneyDetails);
router.patch('/:journeyId/progress', JourneyController.updateProgress);
router.post('/:journeyId/complete', JourneyController.completeJourney);
router.post('/:journeyId/pause', JourneyController.pauseJourney);
router.post('/:journeyId/resume', JourneyController.resumeJourney);
router.get('/:journeyId/stats', JourneyController.getStats);

export default router;

import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authMiddleware';
import opportunityController from '../controllers/opportunity.controller';

const router = Router();

router.use(authenticate);

router.get('/', opportunityController.getPendingOpportunities.bind(opportunityController));
router.post('/:opportunityId/respond', opportunityController.respondToOpportunity.bind(opportunityController));

export default router;

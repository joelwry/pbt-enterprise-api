import { Router } from 'express';
import { subscriptionController } from '@/modules/subscriptions/controllers/subscription.controller';
import { authMiddleware } from '@/core/middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/plans', subscriptionController.getAvailablePlans);
router.get('/plans/compare', subscriptionController.compareFeatures);

// Protected routes
router.use(authMiddleware);

router.get('/current', subscriptionController.getCurrentSubscription);
router.post('/upgrade', subscriptionController.upgradeSubscription);
router.post('/downgrade', subscriptionController.downgradeSubscription);
router.post('/cancel', subscriptionController.cancelSubscription);
router.get('/suggestions', subscriptionController.getUpgradeSuggestions);

export default router;

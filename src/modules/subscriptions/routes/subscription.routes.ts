import { Router } from 'express';
import { subscriptionController } from '@/modules/subscriptions/controllers/subscription.controller';
import { authenticate } from '@/core/middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/plans', subscriptionController.getAvailablePlans);
router.get('/plans/compare', subscriptionController.compareFeatures);

// Protected routes
router.use(authenticate);

router.get('/current', subscriptionController.getCurrentSubscription);
router.get('/invoices', subscriptionController.getInvoices);
router.post('/upgrade', subscriptionController.upgradeSubscription);
router.post('/downgrade', subscriptionController.downgradeSubscription);
router.post('/cancel', subscriptionController.cancelSubscription);
router.get('/suggestions', subscriptionController.getUpgradeSuggestions);

export default router;

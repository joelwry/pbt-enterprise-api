import { Router } from 'express';
import { membershipController } from '@/modules/memberships/controllers/membership.controller';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';

const router = Router();

// All membership routes require authentication
router.use(authenticate);

/**
 * Membership Routes
 */

// Get current membership
router.get('/current', catchAsync((req, res) => membershipController.getCurrentMembership(req, res)));

// Upgrade membership
router.post('/upgrade', catchAsync((req, res) => membershipController.upgradeMembership(req, res)));

// Cancel membership
router.post('/cancel', catchAsync((req, res) => membershipController.cancelMembership(req, res)));

// Add accessible year
router.post('/add-year', catchAsync((req, res) => membershipController.addAccessibleYear(req, res)));

export default router;

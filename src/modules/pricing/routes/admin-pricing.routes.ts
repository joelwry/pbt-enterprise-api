import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { requireSection } from '@/core/middleware/sectionMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { pricingController as c } from '@/modules/pricing/controllers/pricing.controller';

const router = Router();

// Section-gated to 'subscriptions', matching where these controls actually
// live in the admin portal: the pricing editor is a card on the
// Subscriptions & Billing page, whose nav item already requires that
// section. This file was the one admin module the section layer missed, so
// an admin granted only (say) Content couldn't see the page but could still
// PUT a new price straight to the API -- which mints a real Stripe Price
// and archives the old one. Every other admin module carries its section;
// this is the same rule, not a new mechanism.
router.use(authenticate, authorize('admin', 'super_admin'), requireSection('subscriptions'));

router.get('/', catchAsync((req, res) => c.adminListPricing(req, res)));
router.put('/:tier/:billingCycle', catchAsync((req, res) => c.adminSetPricing(req, res)));
router.post('/:tier/:billingCycle/reset', catchAsync((req, res) => c.adminResetPricing(req, res)));
router.get('/:tier/:billingCycle/history', catchAsync((req, res) => c.adminGetHistory(req, res)));

export default router;

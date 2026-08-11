import { Router } from 'express';
import { authenticate } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { billingController as c } from '@/modules/billing/controllers/billing.controller';

const router = Router();

// Public -- a visitor who doesn't have an account yet.
router.post('/signup-checkout', catchAsync((req, res) => c.createSignupCheckout(req, res)));

// Authenticated -- an existing member renewing or changing tier.
router.post('/checkout-session', authenticate, catchAsync((req, res) => c.createMemberCheckout(req, res)));

// The webhook route is intentionally NOT here -- it needs the raw request
// body (for Stripe signature verification) and is mounted directly in
// app.ts, ahead of the global express.json() parser.

export default router;

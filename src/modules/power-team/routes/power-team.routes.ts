import { Router } from 'express';
import { powerTeamController } from '@/modules/power-team/controllers/power-team.controller';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { authenticate } from '@/core/middleware/authMiddleware';

const router = Router();

/**
 * Power Team Routes
 */

router.use(authenticate);

// Specific routes must be registered before the /:memberId catch-all --
// previously /:memberId came first and made every route below it unreachable.

// Get all power team members
router.get('/', catchAsync((req, res) => powerTeamController.getPowerTeamMembers(req, res)));

// Get categories
router.get('/categories/list', catchAsync((req, res) => powerTeamController.getCategories(req, res)));

// Get regions
router.get('/regions/list', catchAsync((req, res) => powerTeamController.getRegions(req, res)));

// Get verified members
router.get('/verified/list', catchAsync((req, res) => powerTeamController.getVerifiedMembers(req, res)));

// Get members by category
router.get('/category/:category', catchAsync((req, res) => powerTeamController.getMembersByCategory(req, res)));

// Get member by ID
router.get('/:memberId', catchAsync((req, res) => powerTeamController.getMemberById(req, res)));

export default router;

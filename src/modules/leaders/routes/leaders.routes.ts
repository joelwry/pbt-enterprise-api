import { Router } from 'express';
import { leadersController } from '@/modules/leaders/controllers/leaders.controller';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { authenticate } from '@/core/middleware/authMiddleware';

const router = Router();

/**
 * Leaders Routes
 */

router.use(authenticate);

// Specific routes must be registered before the /:leaderId catch-all --
// previously /:leaderId came first and made every route below it unreachable.

// Get all leaders
router.get('/', catchAsync((req, res) => leadersController.getLeaders(req, res)));

// Get regions
router.get('/regions/list', catchAsync((req, res) => leadersController.getRegions(req, res)));

// Get top leaders
router.get('/top/rated', catchAsync((req, res) => leadersController.getTopLeaders(req, res)));

// Get leaders by region
router.get('/region/:region', catchAsync((req, res) => leadersController.getLeadersByRegion(req, res)));

// Get leader by ID
router.get('/:leaderId', catchAsync((req, res) => leadersController.getLeaderById(req, res)));

export default router;

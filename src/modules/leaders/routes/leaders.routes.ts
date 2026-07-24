import { Router } from 'express';
import { leadersController } from '@/modules/leaders/controllers/leaders.controller';
import { catchAsync } from '@/core/middleware/asyncHandler';

const router = Router();

/**
 * Leaders Routes
 */

// Get all leaders
router.get('/', catchAsync((req, res) => leadersController.getLeaders(req, res)));

// Get leader by ID
router.get('/:leaderId', catchAsync((req, res) => leadersController.getLeaderById(req, res)));

// Get leaders by region
router.get('/region/:region', catchAsync((req, res) => leadersController.getLeadersByRegion(req, res)));

// Get regions
router.get('/regions/list', catchAsync((req, res) => leadersController.getRegions(req, res)));

// Get top leaders
router.get('/top/rated', catchAsync((req, res) => leadersController.getTopLeaders(req, res)));

export default router;

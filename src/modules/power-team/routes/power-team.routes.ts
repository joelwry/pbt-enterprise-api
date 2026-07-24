import { Router } from 'express';
import { powerTeamController } from '@/modules/power-team/controllers/power-team.controller';
import { catchAsync } from '@/core/middleware/asyncHandler';

const router = Router();

/**
 * Power Team Routes
 */

// Get all power team members
router.get('/', catchAsync((req, res) => powerTeamController.getPowerTeamMembers(req, res)));

// Get member by ID
router.get('/:memberId', catchAsync((req, res) => powerTeamController.getMemberById(req, res)));

// Get members by category
router.get('/category/:category', catchAsync((req, res) => powerTeamController.getMembersByCategory(req, res)));

// Get categories
router.get('/categories/list', catchAsync((req, res) => powerTeamController.getCategories(req, res)));

// Get regions
router.get('/regions/list', catchAsync((req, res) => powerTeamController.getRegions(req, res)));

// Get verified members
router.get('/verified/list', catchAsync((req, res) => powerTeamController.getVerifiedMembers(req, res)));

export default router;

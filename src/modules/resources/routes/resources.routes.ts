import { Router } from 'express';
import { resourcesController } from '@/modules/resources/controllers/resources.controller';
import { catchAsync } from '@/core/middleware/asyncHandler';

const router = Router();

/**
 * Resources Routes
 */

// Get resources
router.get('/', catchAsync((req, res) => resourcesController.getResources(req, res)));

// Get resource by ID
router.get('/:resourceId', catchAsync((req, res) => resourcesController.getResourceById(req, res)));

// Get categories
router.get('/categories/list', catchAsync((req, res) => resourcesController.getCategories(req, res)));

// Get types
router.get('/types/list', catchAsync((req, res) => resourcesController.getTypes(req, res)));

// Get popular
router.get('/popular/top', catchAsync((req, res) => resourcesController.getPopularResources(req, res)));

export default router;

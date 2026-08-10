import { Router } from 'express';
import { resourcesController } from '@/modules/resources/controllers/resources.controller';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { authenticate } from '@/core/middleware/authMiddleware';

const router = Router();

router.use(authenticate);

/**
 * Resources Routes
 * Specific routes registered before /:resourceId so it doesn't swallow them
 * as an id — this was a real pre-existing bug (categories/list, types/list,
 * popular/top were all unreachable dead routes before this fix).
 */
router.get('/types/list', catchAsync((req, res) => resourcesController.getTypes(req, res)));
router.get('/popular/top', catchAsync((req, res) => resourcesController.getPopularResources(req, res)));
router.get('/featured', catchAsync((req, res) => resourcesController.getFeatured(req, res)));

router.get('/', catchAsync((req, res) => resourcesController.getResources(req, res)));
router.get('/:resourceId', catchAsync((req, res) => resourcesController.getResourceById(req, res)));
router.post('/:resourceId/download', catchAsync((req, res) => resourcesController.downloadResource(req, res)));

export default router;

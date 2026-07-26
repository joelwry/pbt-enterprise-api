import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { FileUploadHelper } from '@/core/file/FileUploadHelper';
import { adminResourcesController as c } from '@/modules/admin-resources/controllers/admin-resources.controller';

const router = Router();
const upload = FileUploadHelper.configureAnyUpload(200 * 1024 * 1024);

router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/stats', catchAsync((req, res) => c.getStats(req, res)));
router.get('/', catchAsync((req, res) => c.listResources(req, res)));
router.post('/', catchAsync((req, res) => c.createResource(req, res)));
router.get('/:resourceId', catchAsync((req, res) => c.getResourceById(req, res)));
router.patch('/:resourceId', catchAsync((req, res) => c.updateResource(req, res)));
router.delete('/:resourceId', catchAsync((req, res) => c.deleteResource(req, res)));
router.post('/:resourceId/upload', upload.single('file'), catchAsync((req, res) => c.uploadFile(req, res)));

export default router;

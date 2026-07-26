import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { FileUploadHelper } from '@/core/file/FileUploadHelper';
import { adminLeadersController as c } from '@/modules/admin-leaders/controllers/admin-leaders.controller';

const router = Router();
const upload = FileUploadHelper.configureAnyUpload(10 * 1024 * 1024);

router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/stats', catchAsync((req, res) => c.getStats(req, res)));
router.get('/', catchAsync((req, res) => c.listLeaders(req, res)));
router.post('/', catchAsync((req, res) => c.createLeader(req, res)));
router.get('/:leaderId', catchAsync((req, res) => c.getLeaderById(req, res)));
router.patch('/:leaderId', catchAsync((req, res) => c.updateLeader(req, res)));
router.delete('/:leaderId', catchAsync((req, res) => c.deleteLeader(req, res)));
router.post('/:leaderId/photo', upload.single('file'), catchAsync((req, res) => c.uploadPhoto(req, res)));

export default router;

import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { FileUploadHelper } from '@/core/file/FileUploadHelper';
import { adminPowerTeamController as c } from '@/modules/admin-power-team/controllers/admin-power-team.controller';

const router = Router();
const upload = FileUploadHelper.configureAnyUpload(10 * 1024 * 1024);

router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/stats', catchAsync((req, res) => c.getStats(req, res)));
router.get('/', catchAsync((req, res) => c.listPartners(req, res)));
router.post('/', catchAsync((req, res) => c.createPartner(req, res)));
router.get('/:partnerId', catchAsync((req, res) => c.getPartnerById(req, res)));
router.patch('/:partnerId', catchAsync((req, res) => c.updatePartner(req, res)));
router.delete('/:partnerId', catchAsync((req, res) => c.deletePartner(req, res)));
router.post('/:partnerId/logo', upload.single('file'), catchAsync((req, res) => c.uploadLogo(req, res)));

export default router;

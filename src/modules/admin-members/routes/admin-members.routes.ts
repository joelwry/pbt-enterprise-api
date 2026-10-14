import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { requireSection } from '@/core/middleware/sectionMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { adminMembersController as c } from '@/modules/admin-members/controllers/admin-members.controller';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'), requireSection('members'));

router.get('/stats', catchAsync((req, res) => c.getStats(req, res)));
router.get('/', catchAsync((req, res) => c.listMembers(req, res)));
router.post('/', catchAsync((req, res) => c.createMember(req, res)));
router.get('/:memberId', catchAsync((req, res) => c.getMemberById(req, res)));
router.patch('/:memberId', catchAsync((req, res) => c.updateMember(req, res)));
router.get('/:memberId/billing', catchAsync((req, res) => c.getMemberBilling(req, res)));
router.get('/:memberId/learning-progress', catchAsync((req, res) => c.getMemberLearningProgress(req, res)));
router.patch('/:memberId/tier', catchAsync((req, res) => c.changeTier(req, res)));
router.patch('/:memberId/pause', catchAsync((req, res) => c.setPaused(req, res)));
router.post('/:memberId/deactivate', catchAsync((req, res) => c.deactivateAccount(req, res)));
router.post('/:memberId/resend-welcome', catchAsync((req, res) => c.resendWelcomeEmail(req, res)));
router.delete('/:memberId', catchAsync((req, res) => c.deleteMember(req, res)));

export default router;

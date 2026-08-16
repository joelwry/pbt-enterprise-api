import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { requireSection } from '@/core/middleware/sectionMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { adminCommunityController as c } from '@/modules/admin-community/controllers/admin-community.controller';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'), requireSection('community'));

router.get('/stats', catchAsync((req, res) => c.getStats(req, res)));
router.get('/posts', catchAsync((req, res) => c.listPosts(req, res)));
router.post('/posts/:threadId/pin', catchAsync((req, res) => c.togglePin(req, res)));
router.get('/flagged', catchAsync((req, res) => c.getFlaggedPosts(req, res)));
router.post('/flagged/:threadId/approve', catchAsync((req, res) => c.approvePost(req, res)));
router.post('/flagged/:threadId/remove', catchAsync((req, res) => c.removePost(req, res)));
router.get('/pinned', catchAsync((req, res) => c.getPinnedAnnouncements(req, res)));
router.post('/pinned', catchAsync((req, res) => c.createPinnedAnnouncement(req, res)));
router.delete('/pinned/:announcementId', catchAsync((req, res) => c.unpinAnnouncement(req, res)));
router.get('/groups', catchAsync((req, res) => c.getGroups(req, res)));

export default router;

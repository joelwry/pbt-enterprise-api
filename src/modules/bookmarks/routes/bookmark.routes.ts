import { Router } from 'express';
import { protect } from '@/core/middleware/authMiddleware';
import BookmarkController from '../controllers/bookmark.controller';

const router = Router();

router.use(protect);

router.get('/', BookmarkController.getBookmarks);
router.post('/', BookmarkController.createBookmark);
router.delete('/:contentId', BookmarkController.removeBookmark);
router.patch('/:contentId', BookmarkController.updateBookmark);
router.get('/category/:category', BookmarkController.getByCategory);
router.get('/priority/high', BookmarkController.getHighPriority);

export default router;

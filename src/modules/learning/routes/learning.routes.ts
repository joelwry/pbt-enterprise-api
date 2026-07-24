import { Router } from 'express';
import { learningController } from '@/modules/learning/controllers/learning.controller';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { authenticate } from '@/core/middleware/authMiddleware';

const router = Router();

// All learning routes require authentication
router.use(authenticate);

/**
 * Learning Routes
 */

// Year options
router.get('/years', catchAsync((req, res) => learningController.getYearOptions(req, res)));

// Programme overview
router.get('/programmes/:year', catchAsync((req, res) => learningController.getProgrammeByYear(req, res)));

// Module with lessons
router.get('/modules/:moduleId', catchAsync((req, res) => learningController.getModule(req, res)));

// Single lesson
router.get('/lessons/:lessonId', catchAsync((req, res) => learningController.getLesson(req, res)));

// Update lesson progress
router.post('/lessons/:lessonId/progress', catchAsync((req, res) => learningController.updateLessonProgress(req, res)));

// Continue where left off
router.get('/continue', catchAsync((req, res) => learningController.getContinueWhereLeftOff(req, res)));

export default router;

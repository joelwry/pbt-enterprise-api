import { Router } from 'express';
import { authenticate, authorize } from '@/core/middleware/authMiddleware';
import { catchAsync } from '@/core/middleware/asyncHandler';
import { FileUploadHelper } from '@/core/file/FileUploadHelper';
import { adminLearningController as c } from '@/modules/admin-learning/controllers/admin-learning.controller';

const router = Router();
const upload = FileUploadHelper.configureAnyUpload(200 * 1024 * 1024); // lesson video/PDF can be large

// Admin-only: manage the Business Learning Journey hierarchy
// (Roadmap → Roadmap Week → Module → Lesson).
router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/roadmaps', catchAsync((req, res) => c.listRoadmaps(req, res)));
router.post('/roadmaps', catchAsync((req, res) => c.createRoadmap(req, res)));
router.patch('/roadmaps/:roadmapId', catchAsync((req, res) => c.updateRoadmap(req, res)));
router.delete('/roadmaps/:roadmapId', catchAsync((req, res) => c.deleteRoadmap(req, res)));

router.get('/roadmaps/:roadmapId/weeks', catchAsync((req, res) => c.listWeeks(req, res)));
router.post('/roadmaps/:roadmapId/weeks', catchAsync((req, res) => c.createWeek(req, res)));
router.patch('/weeks/:weekId', catchAsync((req, res) => c.updateWeek(req, res)));
router.delete('/weeks/:weekId', catchAsync((req, res) => c.deleteWeek(req, res)));

router.get('/weeks/:weekId/modules', catchAsync((req, res) => c.listModules(req, res)));
router.post('/weeks/:weekId/modules', catchAsync((req, res) => c.createModule(req, res)));
router.patch('/modules/:moduleId', catchAsync((req, res) => c.updateModule(req, res)));
router.delete('/modules/:moduleId', catchAsync((req, res) => c.deleteModule(req, res)));

router.get('/modules/:moduleId/lessons', catchAsync((req, res) => c.listLessons(req, res)));
router.post('/modules/:moduleId/lessons', catchAsync((req, res) => c.createLesson(req, res)));

// Flat lesson list/search/paginate + stats for the Content Management screen —
// registered before /lessons/:lessonId so 'stats' isn't swallowed as an id.
router.get('/lessons', catchAsync((req, res) => c.listLessonsFlat(req, res)));
router.get('/lessons/stats', catchAsync((req, res) => c.getStats(req, res)));

router.get('/lessons/:lessonId', catchAsync((req, res) => c.getLessonById(req, res)));
router.patch('/lessons/:lessonId', catchAsync((req, res) => c.updateLesson(req, res)));
router.delete('/lessons/:lessonId', catchAsync((req, res) => c.deleteLesson(req, res)));
router.post('/lessons/:lessonId/upload', upload.single('file'), catchAsync((req, res) => c.uploadLessonAsset(req, res)));

export default router;

import { Request, Response } from 'express';
import { adminLearningService } from '@/modules/admin-learning/services/admin-learning.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { AppError } from '@/core/errors/AppError';

export class AdminLearningController {
  // ---- Roadmaps ----

  async listRoadmaps(req: Request, res: Response): Promise<void> {
    const roadmaps = await adminLearningService.listRoadmaps();
    ResponseHandler.ok(res, 'Roadmaps retrieved', roadmaps);
  }

  async createRoadmap(req: Request, res: Response): Promise<void> {
    const roadmap = await adminLearningService.createRoadmap(req.body);
    ResponseHandler.created(res, 'Roadmap created', roadmap);
  }

  async updateRoadmap(req: Request, res: Response): Promise<void> {
    const roadmap = await adminLearningService.updateRoadmap(req.params.roadmapId, req.body);
    ResponseHandler.ok(res, 'Roadmap updated', roadmap);
  }

  async deleteRoadmap(req: Request, res: Response): Promise<void> {
    await adminLearningService.deleteRoadmap(req.params.roadmapId);
    ResponseHandler.ok(res, 'Roadmap deleted', {});
  }

  // ---- Roadmap Weeks ----

  async listWeeks(req: Request, res: Response): Promise<void> {
    const weeks = await adminLearningService.listWeeks(req.params.roadmapId);
    ResponseHandler.ok(res, 'Roadmap weeks retrieved', weeks);
  }

  async createWeek(req: Request, res: Response): Promise<void> {
    const week = await adminLearningService.createWeek(req.params.roadmapId, req.body);
    ResponseHandler.created(res, 'Roadmap week created', week);
  }

  async updateWeek(req: Request, res: Response): Promise<void> {
    const week = await adminLearningService.updateWeek(req.params.weekId, req.body);
    ResponseHandler.ok(res, 'Roadmap week updated', week);
  }

  async deleteWeek(req: Request, res: Response): Promise<void> {
    await adminLearningService.deleteWeek(req.params.weekId);
    ResponseHandler.ok(res, 'Roadmap week deleted', {});
  }

  // ---- Modules ----

  async listModules(req: Request, res: Response): Promise<void> {
    const modules = await adminLearningService.listModules(req.params.weekId);
    ResponseHandler.ok(res, 'Modules retrieved', modules);
  }

  async createModule(req: Request, res: Response): Promise<void> {
    const learningModule = await adminLearningService.createModule(req.params.weekId, req.body);
    ResponseHandler.created(res, 'Module created', learningModule);
  }

  async updateModule(req: Request, res: Response): Promise<void> {
    const learningModule = await adminLearningService.updateModule(req.params.moduleId, req.body);
    ResponseHandler.ok(res, 'Module updated', learningModule);
  }

  async deleteModule(req: Request, res: Response): Promise<void> {
    await adminLearningService.deleteModule(req.params.moduleId);
    ResponseHandler.ok(res, 'Module deleted', {});
  }

  // ---- Lessons ----

  async listLessons(req: Request, res: Response): Promise<void> {
    const lessons = await adminLearningService.listLessons(req.params.moduleId);
    ResponseHandler.ok(res, 'Lessons retrieved', lessons);
  }

  /** Flat, paginated, searchable lesson list for the Content Management screen. */
  async listLessonsFlat(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10);
    const year = typeof req.query.year === 'string' && req.query.year !== 'All' ? req.query.year : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const { items, totalItems } = await adminLearningService.listLessonsFlat({ year, search, page, limit });
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    ResponseHandler.paginated(res, 200, 'Lessons retrieved', items, {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    });
  }

  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await adminLearningService.getStats();
    ResponseHandler.ok(res, 'Content stats retrieved', stats);
  }

  async getLessonById(req: Request, res: Response): Promise<void> {
    const result = await adminLearningService.getLessonById(req.params.lessonId);
    ResponseHandler.ok(res, 'Lesson retrieved', result);
  }

  async createLesson(req: Request, res: Response): Promise<void> {
    const lesson = await adminLearningService.createLesson(req.params.moduleId, req.body);
    ResponseHandler.created(res, 'Lesson created', lesson);
  }

  async updateLesson(req: Request, res: Response): Promise<void> {
    const lesson = await adminLearningService.updateLesson(req.params.lessonId, req.body);
    ResponseHandler.ok(res, 'Lesson updated', lesson);
  }

  async deleteLesson(req: Request, res: Response): Promise<void> {
    await adminLearningService.deleteLesson(req.params.lessonId);
    ResponseHandler.ok(res, 'Lesson deleted', {});
  }

  async uploadLessonAsset(req: Request, res: Response): Promise<void> {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      throw new AppError(400, 'No file provided');
    }

    const result = await adminLearningService.uploadLessonAsset(req.params.lessonId, {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });

    ResponseHandler.ok(res, 'Asset uploaded', result);
  }
}

export const adminLearningController = new AdminLearningController();

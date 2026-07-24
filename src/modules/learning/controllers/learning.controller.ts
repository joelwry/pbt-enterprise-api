import { Request, Response } from 'express';
import { learningService } from '@/modules/learning/services/learning.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';
import logger from '@/core/logger/logger';

export class LearningController {
  /**
   * Get year programmes
   * GET /api/v1/learning/years
   */
  async getYearOptions(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    // TODO: Implement fetching available years
    const years = [
      { year: '2024', label: '2024 Cohort', isCurrent: true },
      { year: '2023', label: '2023 Cohort', isCurrent: false },
    ];

    ResponseHandler.ok(res, 'Years retrieved', years);
  }

  /**
   * Get programme overview for year
   * GET /api/v1/learning/programmes/:year
   */
  async getProgrammeByYear(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { year } = req.params;
    const programme = await learningService.getYearProgramme(req.user.userId, year);

    ResponseHandler.ok(res, 'Programme retrieved', programme);
  }

  /**
   * Get module with lessons
   * GET /api/v1/learning/modules/:moduleId
   */
  async getModule(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { moduleId } = req.params;
    const lessons = await learningService.getModuleLessons(req.user.userId, moduleId);

    ResponseHandler.ok(res, 'Module lessons retrieved', lessons);
  }

  /**
   * Get single lesson
   * GET /api/v1/learning/lessons/:lessonId
   */
  async getLesson(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { lessonId } = req.params;
    const lesson = await learningService.getLesson(lessonId, req.user.userId);

    ResponseHandler.ok(res, 'Lesson retrieved', lesson);
  }

  /**
   * Update lesson progress
   * POST /api/v1/learning/lessons/:lessonId/progress
   */
  async updateLessonProgress(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { lessonId } = req.params;
    const { moduleId, status, progressPercent, quizScore } = req.body;

    const progress = await learningService.updateLessonProgress(
      req.user.userId,
      lessonId,
      moduleId,
      status,
      progressPercent,
      quizScore
    );

    logger.info(`Lesson progress updated: ${lessonId} - ${status}`);
    ResponseHandler.ok(res, 'Progress updated', progress);
  }

  /**
   * Get continue where left off
   * GET /api/v1/learning/continue
   */
  async getContinueWhereLeftOff(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const lessons = await learningService.getContinueWhereLeftOff(req.user.userId);

    ResponseHandler.ok(res, 'Continue lessons retrieved', lessons);
  }
}

export const learningController = new LearningController();

import { Request, Response } from 'express';
import { learningService } from '@/modules/learning/services/learning.service';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import logger from '@/core/logger/logger';

export class LearningController {
  /**
   * Available roadmap years
   * GET /api/v1/learning/years
   */
  async getYearOptions(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const years = await learningService.getRoadmapYears();
    ResponseHandler.ok(res, 'Years retrieved', years);
  }

  /**
   * Roadmap overview for a year
   * GET /api/v1/learning/roadmap/:year
   */
  async getRoadmap(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { year } = req.params;
    const roadmap = await learningService.getRoadmapForYear(req.user.userId, year);

    ResponseHandler.ok(res, 'Roadmap retrieved', roadmap);
  }

  /**
   * A roadmap week's modules
   * GET /api/v1/learning/weeks/:weekId
   */
  async getWeek(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    const { weekId } = req.params;
    const week = await learningService.getWeekModules(weekId, req.user.userId);

    ResponseHandler.ok(res, 'Roadmap week retrieved', week);
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
   * Continue where left off — reads the aggregate UserProgress projection only.
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

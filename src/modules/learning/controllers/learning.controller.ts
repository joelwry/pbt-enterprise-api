import { Request, Response } from 'express';
import { learningService } from '@/modules/learning/services/learning.service';
import { MembershipTier } from '@/modules/learning/schemas/Learning.schema';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { PaginationHelper } from '@/core/pagination/PaginationHelper';
import logger from '@/core/logger/logger';

const VALID_TIERS = new Set(['Pathway', 'Plus', 'Mentorship']);

/**
 * PBT Pathway is Pathway-tier content only -- Plus/Masterplan lessons live
 * on their own dedicated pages (see admin-content and the Plus/Masterplan
 * learning routes), never mixed into the shared roadmap view. Defaulting to
 * 'Pathway' here means the existing /learning/roadmap etc. routes are
 * correct for the Pathway page with no query param at all; the dedicated
 * tier pages pass `?tier=Plus` / `?tier=Mentorship` to reuse the same
 * endpoints instead of standing up parallel ones.
 */
function tierFromQuery(req: Request): MembershipTier {
  const raw = req.query.tier;
  return typeof raw === 'string' && VALID_TIERS.has(raw) ? (raw as MembershipTier) : 'Pathway';
}

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
    const roadmap = await learningService.getRoadmapForYear(req.user.userId, year, tierFromQuery(req));

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
    const week = await learningService.getWeekModules(weekId, req.user.userId, tierFromQuery(req));

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
    const { page, limit } = PaginationHelper.parse({ page: req.query.page as string, limit: (req.query.limit as string) ?? '4' });
    const { items, totalItems } = await learningService.getModuleLessons(req.user.userId, moduleId, tierFromQuery(req), page, limit);

    ResponseHandler.paginated(res, 200, 'Module lessons retrieved', items, PaginationHelper.createMeta(page, limit, totalItems));
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
    const { moduleId, status, progressPercent, quizScore, timeSpentMinutes } = req.body;

    const progress = await learningService.updateLessonProgress(
      req.user.userId,
      lessonId,
      moduleId,
      status,
      progressPercent,
      quizScore,
      timeSpentMinutes
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

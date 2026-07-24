import { Request, Response } from 'express';
import { asyncHandler } from '@/core/middleware/asyncHandler';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import ProgressService from '../services/progress.service';
import MilestoneService from '../services/milestone.service';

export class ProgressController {
  getProgress = asyncHandler(async (req: Request, res: Response) => {
    const { programmeId } = req.params;
    const userId = (req as any).user.userId;

    const progress = await ProgressService.getUserProgress(userId, programmeId);
    return ResponseHandler.ok(res, 'User progress retrieved', progress);
  });

  updateLessonProgress = asyncHandler(async (req: Request, res: Response) => {
    const { programmeId, lessonId } = req.params;
    const { completionPercentage, timeSpentMinutes } = req.body;
    const userId = (req as any).user.userId;

    const updatedProgress = await ProgressService.updateLessonProgress(
      userId,
      programmeId,
      lessonId,
      completionPercentage,
      timeSpentMinutes
    );

    return ResponseHandler.ok(res, 'Lesson progress updated', updatedProgress);
  });

  markLessonComplete = asyncHandler(async (req: Request, res: Response) => {
    const { programmeId, lessonId } = req.params;
    const userId = (req as any).user.userId;

    const updatedProgress = await ProgressService.markLessonComplete(userId, programmeId, lessonId);
    return ResponseHandler.ok(res, 'Lesson marked complete', updatedProgress);
  });

  getContinueWhere = asyncHandler(async (req: Request, res: Response) => {
    const { programmeId } = req.params;
    const userId = (req as any).user.userId;

    const continueData = await ProgressService.getContinueWhere(userId, programmeId);
    return ResponseHandler.ok(res, 'Continue where left off retrieved', continueData);
  });

  addNote = asyncHandler(async (req: Request, res: Response) => {
    const { programmeId, contentId } = req.params;
    const { note } = req.body;
    const userId = (req as any).user.userId;

    const updatedProgress = await ProgressService.addNote(userId, programmeId, contentId, note);
    return ResponseHandler.ok(res, 'Note added', updatedProgress);
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    const stats = await ProgressService.getUserStats(userId);
    return ResponseHandler.ok(res, 'User learning stats retrieved', stats);
  });

  getMilestones = asyncHandler(async (req: Request, res: Response) => {
    const { programmeId } = req.params;
    const userId = (req as any).user.userId;

    const milestones = await MilestoneService.getUserMilestones(userId, programmeId);
    return ResponseHandler.ok(res, 'Milestones retrieved', milestones);
  });

  getUnlockedMilestones = asyncHandler(async (req: Request, res: Response) => {
    const { programmeId } = req.params;
    const userId = (req as any).user.userId;

    const unlockedMilestones = await MilestoneService.getUnlockedMilestones(userId, programmeId);
    return ResponseHandler.ok(res, 'Unlocked milestones retrieved', unlockedMilestones);
  });

  getRewards = asyncHandler(async (req: Request, res: Response) => {
    const { programmeId } = req.params;
    const userId = (req as any).user.userId;

    const rewards = await MilestoneService.calculateTotalRewards(userId, programmeId);
    return ResponseHandler.ok(res, 'Total rewards calculated', rewards);
  });
}

export default new ProgressController();

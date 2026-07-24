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
    return ResponseHandler.success(res, progress, 'User progress retrieved');
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

    return ResponseHandler.success(res, updatedProgress, 'Lesson progress updated');
  });

  markLessonComplete = asyncHandler(async (req: Request, res: Response) => {
    const { programmeId, lessonId } = req.params;
    const userId = (req as any).user.userId;

    const updatedProgress = await ProgressService.markLessonComplete(userId, programmeId, lessonId);
    return ResponseHandler.success(res, updatedProgress, 'Lesson marked complete');
  });

  getContinueWhere = asyncHandler(async (req: Request, res: Response) => {
    const { programmeId } = req.params;
    const userId = (req as any).user.userId;

    const continueData = await ProgressService.getContinueWhere(userId, programmeId);
    return ResponseHandler.success(res, continueData, 'Continue where left off retrieved');
  });

  addNote = asyncHandler(async (req: Request, res: Response) => {
    const { programmeId, contentId } = req.params;
    const { note } = req.body;
    const userId = (req as any).user.userId;

    const updatedProgress = await ProgressService.addNote(userId, programmeId, contentId, note);
    return ResponseHandler.success(res, updatedProgress, 'Note added');
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    const stats = await ProgressService.getUserStats(userId);
    return ResponseHandler.success(res, stats, 'User learning stats retrieved');
  });

  getMilestones = asyncHandler(async (req: Request, res: Response) => {
    const { programmeId } = req.params;
    const userId = (req as any).user.userId;

    const milestones = await MilestoneService.getUserMilestones(userId, programmeId);
    return ResponseHandler.success(res, milestones, 'Milestones retrieved');
  });

  getUnlockedMilestones = asyncHandler(async (req: Request, res: Response) => {
    const { programmeId } = req.params;
    const userId = (req as any).user.userId;

    const unlockedMilestones = await MilestoneService.getUnlockedMilestones(userId, programmeId);
    return ResponseHandler.success(res, unlockedMilestones, 'Unlocked milestones retrieved');
  });

  getRewards = asyncHandler(async (req: Request, res: Response) => {
    const { programmeId } = req.params;
    const userId = (req as any).user.userId;

    const rewards = await MilestoneService.calculateTotalRewards(userId, programmeId);
    return ResponseHandler.success(res, rewards, 'Total rewards calculated');
  });
}

export default new ProgressController();

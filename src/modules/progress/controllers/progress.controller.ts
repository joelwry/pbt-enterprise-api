import { Request, Response } from 'express';
import { asyncHandler } from '@/core/middleware/asyncHandler';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import ProgressService from '../services/progress.service';
import MilestoneService from '../services/milestone.service';

export class ProgressController {
  getProgress = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    const progress = await ProgressService.getUserProgress(userId);
    return ResponseHandler.ok(res, 'User progress retrieved', progress);
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    const stats = await ProgressService.getUserStats(userId);
    return ResponseHandler.ok(res, 'User learning stats retrieved', stats);
  });

  getMilestones = asyncHandler(async (req: Request, res: Response) => {
    const { roadmapId } = req.params;
    const userId = (req as any).user.userId;

    const milestones = await MilestoneService.getUserMilestones(userId, roadmapId);
    return ResponseHandler.ok(res, 'Milestones retrieved', milestones);
  });

  getUnlockedMilestones = asyncHandler(async (req: Request, res: Response) => {
    const { roadmapId } = req.params;
    const userId = (req as any).user.userId;

    const unlockedMilestones = await MilestoneService.getUnlockedMilestones(userId, roadmapId);
    return ResponseHandler.ok(res, 'Unlocked milestones retrieved', unlockedMilestones);
  });

  getRewards = asyncHandler(async (req: Request, res: Response) => {
    const { roadmapId } = req.params;
    const userId = (req as any).user.userId;

    const rewards = await MilestoneService.calculateTotalRewards(userId, roadmapId);
    return ResponseHandler.ok(res, 'Total rewards calculated', rewards);
  });
}

export default new ProgressController();

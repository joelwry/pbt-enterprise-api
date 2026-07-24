import { Request, Response } from 'express';
import { asyncHandler } from '@/core/middleware/asyncHandler';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import JourneyService from '../services/journey.service';

export class JourneyController {
  getUserJourneys = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { status } = req.query;

    const journeys = await JourneyService.getUserJourneys(userId, status as string);
    return ResponseHandler.success(res, journeys, 'User journeys retrieved');
  });

  createJourney = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { journeyName, description, programmeIds, lessonSequence, resources, estimatedDurationHours } = req.body;

    const journey = await JourneyService.createJourney(userId, {
      journeyName,
      description,
      programmeIds,
      lessonSequence,
      resources,
      estimatedDurationHours,
    });

    return ResponseHandler.success(res, journey, 'Learning journey created', 201);
  });

  getJourneyDetails = asyncHandler(async (req: Request, res: Response) => {
    const { journeyId } = req.params;
    // Implementation would fetch the journey from database
    return ResponseHandler.success(res, { journeyId }, 'Journey details retrieved');
  });

  updateProgress = asyncHandler(async (req: Request, res: Response) => {
    const { journeyId } = req.params;
    const { currentStep, progress } = req.body;

    const updatedJourney = await JourneyService.updateJourneyProgress(journeyId, currentStep, progress);
    return ResponseHandler.success(res, updatedJourney, 'Journey progress updated');
  });

  completeJourney = asyncHandler(async (req: Request, res: Response) => {
    const { journeyId } = req.params;

    const completedJourney = await JourneyService.completeJourney(journeyId);
    return ResponseHandler.success(res, completedJourney, 'Journey completed');
  });

  pauseJourney = asyncHandler(async (req: Request, res: Response) => {
    const { journeyId } = req.params;

    const pausedJourney = await JourneyService.pauseJourney(journeyId);
    return ResponseHandler.success(res, pausedJourney, 'Journey paused');
  });

  resumeJourney = asyncHandler(async (req: Request, res: Response) => {
    const { journeyId } = req.params;

    const resumedJourney = await JourneyService.resumeJourney(journeyId);
    return ResponseHandler.success(res, resumedJourney, 'Journey resumed');
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    const { journeyId } = req.params;

    const stats = await JourneyService.getJourneyStats(journeyId);
    return ResponseHandler.success(res, stats, 'Journey statistics retrieved');
  });

  getActiveJourneys = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { limit } = req.query;

    const journeys = await JourneyService.getUserActiveJourneys(userId, parseInt(limit as string) || 5);
    return ResponseHandler.success(res, journeys, 'Active journeys retrieved');
  });
}

export default new JourneyController();

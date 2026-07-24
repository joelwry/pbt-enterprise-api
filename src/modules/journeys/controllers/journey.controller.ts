import { Request, Response } from 'express';
import { asyncHandler } from '@/core/middleware/asyncHandler';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import JourneyService from '../services/journey.service';

export class JourneyController {
  getUserJourneys = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { status } = req.query;

    const journeys = await JourneyService.getUserJourneys(userId, status as string);
    return ResponseHandler.ok(res, 'User journeys retrieved', journeys);
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

    return ResponseHandler.created(res, 'Learning journey created', journey);
  });

  getJourneyDetails = asyncHandler(async (req: Request, res: Response) => {
    const { journeyId } = req.params;
    // Implementation would fetch the journey from database
    return ResponseHandler.ok(res, 'Journey details retrieved', { journeyId });
  });

  updateProgress = asyncHandler(async (req: Request, res: Response) => {
    const { journeyId } = req.params;
    const { currentStep, progress } = req.body;

    const updatedJourney = await JourneyService.updateJourneyProgress(journeyId, currentStep, progress);
    return ResponseHandler.ok(res, 'Journey progress updated', updatedJourney);
  });

  completeJourney = asyncHandler(async (req: Request, res: Response) => {
    const { journeyId } = req.params;

    const completedJourney = await JourneyService.completeJourney(journeyId);
    return ResponseHandler.ok(res, 'Journey completed', completedJourney);
  });

  pauseJourney = asyncHandler(async (req: Request, res: Response) => {
    const { journeyId } = req.params;

    const pausedJourney = await JourneyService.pauseJourney(journeyId);
    return ResponseHandler.ok(res, 'Journey paused', pausedJourney);
  });

  resumeJourney = asyncHandler(async (req: Request, res: Response) => {
    const { journeyId } = req.params;

    const resumedJourney = await JourneyService.resumeJourney(journeyId);
    return ResponseHandler.ok(res, 'Journey resumed', resumedJourney);
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    const { journeyId } = req.params;

    const stats = await JourneyService.getJourneyStats(journeyId);
    return ResponseHandler.ok(res, 'Journey statistics retrieved', stats);
  });

  getActiveJourneys = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { limit } = req.query;

    const journeys = await JourneyService.getUserActiveJourneys(userId, parseInt(limit as string) || 5);
    return ResponseHandler.ok(res, 'Active journeys retrieved', journeys);
  });
}

export default new JourneyController();

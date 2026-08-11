import { Request, Response } from 'express';
import mentorService from '../services/mentor.service';
import sessionService from '../services/session.service';
import { ResponseHandler } from '../../../core/response/ResponseHandler';

export class MentorController {
  async getMentors(req: Request, res: Response) {
    const { expertise, sortBy } = req.query;
    const filter: any = {};
    if (expertise) filter.expertise = expertise;
    const mentors = await mentorService.getMentors(filter);
    ResponseHandler.ok(res, 'Mentors retrieved', mentors);
  }

  async getMentorById(req: Request, res: Response) {
    const { mentorId } = req.params;
    const mentor = await mentorService.getMentorById(mentorId);
    ResponseHandler.ok(res, 'Mentor retrieved', mentor);
  }

  async bookSession(req: Request, res: Response) {
    const { mentorId } = req.params;
    const session = await sessionService.bookSession(mentorId, req.user!.userId, req.body);
    ResponseHandler.created(res, 'Session booked', session);
  }

  async getSessionHistory(req: Request, res: Response) {
    const sessions = await sessionService.getSessionHistory(req.user!.userId);
    ResponseHandler.ok(res, 'Session history retrieved', sessions);
  }
}

export default new MentorController();

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
    ResponseHandler.success(res, mentors, 'Mentors retrieved');
  }

  async getMentorById(req: Request, res: Response) {
    const { mentorId } = req.params;
    const mentor = await mentorService.getMentorById(mentorId);
    ResponseHandler.success(res, mentor, 'Mentor retrieved');
  }

  async bookSession(req: Request, res: Response) {
    const { mentorId } = req.params;
    const session = await sessionService.bookSession(mentorId, req.user!.id, req.body);
    ResponseHandler.success(res, session, 'Session booked', 201);
  }

  async getSessionHistory(req: Request, res: Response) {
    const sessions = await sessionService.getSessionHistory(req.user!.id);
    ResponseHandler.success(res, sessions, 'Session history retrieved');
  }
}

export default new MentorController();

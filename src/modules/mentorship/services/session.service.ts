import { MentorSession } from '../schemas/MentorSession.schema';

export class SessionService {
  async bookSession(mentorId: string, memberId: string, data: any) {
    const session = new MentorSession({ mentorId, memberId, ...data });
    return session.save();
  }

  async getSessionHistory(memberId: string) {
    return MentorSession.find({ memberId })
      .populate('mentorId', 'expertise')
      .sort({ scheduledAt: -1 });
  }

  async completedSession(sessionId: string, notes?: string) {
    return MentorSession.findByIdAndUpdate(
      sessionId,
      { status: 'completed', notes },
      { new: true }
    );
  }

  async ratSession(sessionId: string, rating: number) {
    return MentorSession.findByIdAndUpdate(sessionId, { rating }, { new: true });
  }
}

export default new SessionService();

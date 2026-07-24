import { Mentor } from '../schemas/Mentor.schema';

export class MentorService {
  async createMentor(memberId: string, data: any) {
    const mentor = new Mentor({ memberId, ...data });
    return mentor.save();
  }

  async getMentors(filter: any = {}) {
    return Mentor.find(filter)
      .populate('memberId', 'name email avatar')
      .sort({ rating: -1 });
  }

  async getMentorById(mentorId: string) {
    return Mentor.findById(mentorId).populate('memberId', 'name email avatar bio');
  }

  async addReview(mentorId: string, rating: number) {
    const mentor = await Mentor.findById(mentorId);
    if (!mentor) throw new Error('Mentor not found');
    mentor.rating = (mentor.rating * mentor.totalReviews + rating) / (mentor.totalReviews + 1);
    mentor.totalReviews += 1;
    return mentor.save();
  }
}

export default new MentorService();

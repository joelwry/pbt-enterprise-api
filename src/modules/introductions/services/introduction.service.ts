import { MemberIntroduction } from '../schemas/MemberIntroduction.schema';
import { AppError } from '../../../core/errors/AppError';

export class IntroductionService {
  async sendIntroduction(fromMemberId: string, toMemberId: string, message: string) {
    const introduction = new MemberIntroduction({
      fromMemberId,
      toMemberId,
      message,
      connectionStrength: Math.random() * 100,
    });
    return introduction.save();
  }

  async getReceivedIntroduction(memberId: string) {
    return MemberIntroduction.find({ toMemberId: memberId, status: 'pending' })
      .populate('fromMemberId', 'name email')
      .sort({ createdAt: -1 });
  }

  async acceptIntroduction(introductionId: string, memberId: string) {
    const intro = await MemberIntroduction.findById(introductionId);
    if (!intro || intro.toMemberId.toString() !== memberId) {
      throw new AppError(403, 'Unauthorized', ['ERR_2003']);
    }
    intro.status = 'accepted';
    intro.connectedAt = new Date();
    return intro.save();
  }

  async getConnections(memberId: string) {
    return MemberIntroduction.find({
      $or: [
        { fromMemberId: memberId, status: 'accepted' },
        { toMemberId: memberId, status: 'accepted' },
      ],
    }).populate('fromMemberId toMemberId', 'name email avatar');
  }
}

export default new IntroductionService();

import { BusinessQuestion } from '../schemas/BusinessQuestion.schema';

export class QuestionService {
  async createQuestion(data: any) {
    const question = new BusinessQuestion(data);
    return question.save();
  }

  async getOpenQuestions(category?: string) {
    const filter: any = { status: 'open' };
    if (category) filter.category = category;
    return BusinessQuestion.find(filter)
      .populate('memberId', 'name email avatar')
      .sort({ createdAt: -1 });
  }

  async answerQuestion(questionId: string, memberId: string, content: string) {
    return BusinessQuestion.findByIdAndUpdate(
      questionId,
      { $push: { answers: { memberId, content, createdAt: new Date() } } },
      { new: true }
    );
  }

  async markSolved(questionId: string, answerId: string) {
    return BusinessQuestion.findByIdAndUpdate(
      questionId,
      { status: 'answered', solvedAnswerId: answerId },
      { new: true }
    );
  }
}

export default new QuestionService();

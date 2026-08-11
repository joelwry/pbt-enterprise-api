import { Request, Response } from 'express';
import questionService from '../services/question.service';
import { ResponseHandler } from '../../../core/response/ResponseHandler';

export class QuestionController {
  async createQuestion(req: Request, res: Response) {
    const question = await questionService.createQuestion({ ...req.body, memberId: req.user!.userId });
    ResponseHandler.created(res, 'Question created', question);
  }

  async getOpenQuestions(req: Request, res: Response) {
    const { category } = req.query;
    const questions = await questionService.getOpenQuestions(category as string);
    ResponseHandler.ok(res, 'Questions retrieved', questions);
  }

  async answerQuestion(req: Request, res: Response) {
    const { questionId } = req.params;
    const { content } = req.body;
    const question = await questionService.answerQuestion(questionId, req.user!.userId, content);
    ResponseHandler.ok(res, 'Answer added', question);
  }
}

export default new QuestionController();

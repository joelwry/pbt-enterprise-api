import { Request, Response } from 'express';
import questionService from '../services/question.service';
import { ResponseHandler } from '../../../core/response/ResponseHandler';

export class QuestionController {
  async createQuestion(req: Request, res: Response) {
    const question = await questionService.createQuestion({ ...req.body, memberId: req.user!.id });
    ResponseHandler.success(res, question, 'Question created', 201);
  }

  async getOpenQuestions(req: Request, res: Response) {
    const { category } = req.query;
    const questions = await questionService.getOpenQuestions(category as string);
    ResponseHandler.success(res, questions, 'Questions retrieved');
  }

  async answerQuestion(req: Request, res: Response) {
    const { questionId } = req.params;
    const { content } = req.body;
    const question = await questionService.answerQuestion(questionId, req.user!.id, content);
    ResponseHandler.success(res, question, 'Answer added');
  }
}

export default new QuestionController();

import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authMiddleware';
import introductionController from '../controllers/introduction.controller';

const router = Router();

router.use(authenticate);

router.post('/', introductionController.sendIntroduction.bind(introductionController));
router.get('/received', introductionController.getReceivedIntroductions.bind(introductionController));
router.patch('/:introductionId/accept', introductionController.acceptIntroduction.bind(introductionController));
router.get('/connections', introductionController.getConnections.bind(introductionController));

export default router;

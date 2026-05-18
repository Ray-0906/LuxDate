import { Router } from 'express';
import relationshipController from '../controllers/relationship.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/options/:girlId', relationshipController.getOptions);
router.get('/my', relationshipController.getMyConnections);
router.post('/invite', relationshipController.invite);
router.post('/:relationshipId/accept', relationshipController.accept);
router.post('/:relationshipId/break', relationshipController.break);

export default router;

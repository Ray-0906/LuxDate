import { Router } from 'express';
import feedController from '../controllers/feed.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/hot', feedController.getHotFeed);
router.get('/nearby', feedController.getNearbyFeed);
router.get('/random', feedController.getRandomProfile);
router.get('/search', feedController.searchById);
router.get('/:girlId', feedController.getGirlProfile);

export default router;

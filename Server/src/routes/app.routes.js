import { Router } from 'express';
import appController from '../controllers/app.controller.js';

const router = Router();

router.get('/settings', appController.getSettings);

export default router;

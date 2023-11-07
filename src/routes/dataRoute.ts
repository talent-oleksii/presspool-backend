import express, { Router } from 'express';
import data from '../controller/dataController';

const router: Router = express.Router();

// Define routes
router.get('/newsletter', data.getNewsletter);
router.get('/pricing', data.getPricing);
router.post('/campaign', data.addCampaign);
router.get('/campaign', data.getCampaign);

export default router;
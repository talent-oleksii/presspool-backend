import express, { Router } from 'express';
import data from '../controller/dataController';

const router: Router = express.Router();

// Define routes
router.get('/newsletter', data.getNewsletter);
router.get('/pricing', data.getPricing);
router.post('/campaign', data.addCampaign);
router.get('/campaign', data.getCampaign);
router.post('/audience', data.addAudience);
router.get('/audience', data.getAudience);
router.get('/campaign_detail', data.getCampaignDetail);
router.put('/campaign_detail', data.updateCampaignDetail);
router.post('/campaign_ui', data.addCampaignUI);
router.put('/campaign_ui', data.updateCampaignUI);
router.get('/audience', data.getAudience);

export default router;
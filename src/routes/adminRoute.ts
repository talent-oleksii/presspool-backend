import express, { Router } from 'express';
import campaign from '../controller/admin/campaign';

const router: Router = express.Router();

// Define routes
router.get('/data/campaign', campaign.getCampaign);

export default router;
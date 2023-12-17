import express, { Router } from 'express';
import campaign from '../controller/admin/campaign';
import adminAuth from '../controller/admin/adminAuthController';

const router: Router = express.Router();

// Define routes

router.post('/auth/login', adminAuth.signIn);
router.post('/auth/check', adminAuth.authCheck);

router.get('/data/campaign', campaign.getCampaign);

export default router;
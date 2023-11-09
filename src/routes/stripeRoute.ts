import express, { Router } from 'express';
import stripe from '../controller/stripeController';

const router: Router = express.Router();

router.post('/purchase', stripe.purchaseCampaign);
router.post('/prepare', stripe.preparePayment);

export default router;
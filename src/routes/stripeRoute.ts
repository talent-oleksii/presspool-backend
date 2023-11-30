import express, { Router } from 'express';
import stripe from '../controller/stripeController';

const router: Router = express.Router();

router.post('/purchase', stripe.purchaseCampaign);
router.post('/prepare', stripe.preparePayment);
router.get('/card', stripe.getCard);
router.post('/card', stripe.addCard);
router.delete('/card', stripe.deleteCard);

export default router;
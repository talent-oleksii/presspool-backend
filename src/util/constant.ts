import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET as string);

const constant = {
  stripe,
};

export default constant;
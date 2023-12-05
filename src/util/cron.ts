import Stripe from 'stripe';
import dotenv from 'dotenv';
import log from './logger';

dotenv.config({ path: './.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET as string);

const cronFunction = async () => { // Here we notify users about billing
  try {

    // below are auto payment codes.
    // const email = 'oleksiikaravanov@gmail.com';
    // const list = await stripe.customers.list({ email });

    // const customer = await stripe.customers.create({
    //   email,
    //   source: 'src_1OH7yRFx5HbKLtp4jR8kER4c',
    // });

    // await stripe.charges.create({
    //   amount: 523000,
    //   currency: 'usd',
    //   customer: customer.id,
    //   source: 'src_1OH7yRFx5HbKLtp4jR8kER4c',
    // });

  } catch (error) {
    log.error(`error: ${error}`);
  }

};

export default cronFunction;
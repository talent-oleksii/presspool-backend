import Stripe from 'stripe';
import dotenv from 'dotenv';
import log from './logger';
import db from './db';

import mailer from './mailer';

dotenv.config({ path: './.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET as string);

const billingFunction = async () => { // Here we notify users about billing
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

const mailingFunction = async () => {
  console.log('is this called?');
  try {
    const users = await db.query('SELECT user_list.email, user_list.name, user_list.create_time FROM user_list LEFT JOIN campaign ON campaign.email = user_list.email WHERE campaign.email IS NULL');
    for (const user of users.rows) {
      const targetTimestamp = Number(user.create_time);

      const currentTimestamp = Date.now();

      const oneDayInMilliseconds = 24 * 60 * 60 * 1000; // Number of milliseconds in a day
      const previousDayTimestamp = currentTimestamp - oneDayInMilliseconds;

      // Check if today is one day after the target timestamp
      if (currentTimestamp > targetTimestamp && previousDayTimestamp <= targetTimestamp) {
        mailer.sendTutorialEmail(user.email, user.name);
      } else {
        console.log('is not one day after the user creation');
      }
    }
  } catch (error) {
    console.log('error:', error);
  }
};

const cronFunction = {
  billingFunction,
  mailingFunction,
};

export default cronFunction;
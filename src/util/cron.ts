import Stripe from 'stripe';
import dotenv from 'dotenv';
import log from './logger';
import db from './db';

import mailer from './mailer';

dotenv.config({ path: './.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET as string);

const billingFunction = async () => { // Here we notify users about billing
  try {
    console.log('billined called');
    const activeCampaigns = await db.query('SELECT campaign.id, campaign.name, campaign.email, campaign.billed, campaign.spent, campaign.card_id from campaign LEFT JOIN card_info ON campaign.card_id = card_info.card_id  where state = $1', ['active']);
    for (const campaign of activeCampaigns.rows) {
      const billAmount = (Number(campaign.spent) - Number(campaign.billed)) * 100;
      if (billAmount === 0) continue;
      console.log('billing campaign:', campaign);
      let customer;
      const existingCustomers = await stripe.customers.list({ email: campaign.email as string });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({ email: campaign.email as string });
      }

      await stripe.paymentIntents.create({
        customer: customer.id,
        amount: billAmount,
        currency: 'usd',
        payment_method: campaign.card_id,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          state: 'weekly'
        },
        description: `${campaign.name}`,
        confirm: true,
      });

      // update billed information on database
      const newBilled = Number(campaign.billed) + billAmount / 100;
      await db.query('UPDATE campaign set billed = $1 where id = $2', [newBilled, campaign.id]);
    }
  } catch (error) {
    log.error(`weekly billing error: ${error}`);
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
        console.log(`tutorial email sent to user ${user.email}`);
        await mailer.sendTutorialEmail(user.email, user.name);
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
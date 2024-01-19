import Stripe from 'stripe';
import dotenv from 'dotenv';
import log from './logger';
import db from './db';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

import mailer from './mailer';

dotenv.config({ path: './.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET as string);

async function initializeClient() {
  console.log('dd:', process.env.GOOGLE_ANALYTIC_PRIVATE_KEY);
  try {
    const client = new BetaAnalyticsDataClient({
      credentials: {
        // type: process.env.GOOGLE_ANALYTIC_TYPE,
        client_email: process.env.GOOGLE_ANALYTIC_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_ANALYTIC_PRIVATE_KEY,
        // private_key_id: process.env.GOOGLE_ANALYTIC_PRIVATE_KEY_ID,
        // project_id: process.env.GOOGLE_ANALYTIC_PROJECT_ID,
        // client_id: process.env.GOOGLE_ANALYTIC_CLIENT_ID,
        // client_secret?: string;
        // refresh_token: process.env.GOOGLE_ANALYTIC_TOKEN_URI,
        // quota_project_id: process.env.GOOGLE_ANALYTIC_PROJECT_ID,
        // universe_domain: process.env.GOOGLE_ANALYTIC_UNIVERSE_DOMAIN,
      }
    });
    return client;
  } catch (e) {
    console.error(`Error initializing GA4 client: ${e}`);
    return null;
  }
}

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
        console.log('tutorial email check: all sent!');
      }
    }
  } catch (error) {
    console.log('error:', error);
  }
};

async function runReport(client: BetaAnalyticsDataClient, propertyId: any,) {
  // const dimensions = [{ name: "date" }, { name: "eventName" }, { name: "pagePath" }];
  // const metrics = [{ name: "eventCount" }, { name: 'totalUsers' }];

  // const request = {
  //   property: `properties/${propertyId}`,
  //   dimensions: dimensions,
  //   metrics: metrics,
  //   dateRanges: [{ startDate: startDate, endDate: endDate }],
  // };

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2024-01-15', endDate: '2024-01-20' }],
      dimensions: [{ name: 'fullPageUrl' }],
      metrics: [{
        name: 'totalUsers'
      }, {
        name: 'sessions'
      }, {
        name: 'activeUsers'
      }, {
        name: 'newUsers'
      }, {
        name: 'screenPageViews',
      }],
      // metrics: [{ name: 'sessions' }],
      // dimensions: [{ name: 'country' }]
    });
    return response;
  } catch (e) {
    console.error(`Error running GA4 report: ${e}`);
    return null;
  }
}

const scrapeFunction = async () => {
  console.log('get from google analytics is running...');
  try {
    const client: BetaAnalyticsDataClient = await initializeClient() as BetaAnalyticsDataClient;
    const propertyId = "410414057";
    const response: any = await runReport(client, propertyId);

    if (!response) {
      console.error('Failed to fetch report data');
      return;
    }

    const result = response.rows.map((item: any) => ({
      fullPageUrl: item.dimensionValues[0].value,
      totalUsers: item.metricValues[0].value,
      sessions: item.metricValues[1].value,
      activeUsers: item.metricValues[2].value,
      newUsers: item.metricValues[3].value,
      screenPageViews: item.metricValues[4].value,
    }));

    console.log(result);


  } catch (error) {
    console.log('error:', error);
  }
};

const cronFunction = {
  billingFunction,
  mailingFunction,
  scrapeFunction,
};

export default cronFunction;
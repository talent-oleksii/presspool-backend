import Stripe from 'stripe';
import dotenv from 'dotenv';
import log from './logger';
import db from './db';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

import mailer from './mailer';
import axios from 'axios';

dotenv.config({ path: './.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET as string);

async function initializeClient() {
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

async function runReport(client: BetaAnalyticsDataClient, propertyId: any, startDate: any, endDate: any) {
  // Function implementation...

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
      dateRanges: [{ startDate: startDate, endDate: endDate }],
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

const runRealtimeReport = async (client: BetaAnalyticsDataClient, propertyId: string) => {
  try {
    const [response] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      // dimensions: [{
      //   name: 'streamId',
      // }, {
      //   name: 'countryId'
      // }, {
      //   name: 'deviceCategory'
      // }],
      dimensions: [{ name: 'unifiedScreenName' }, { name: 'deviceCategory' }],
      // metrics: [{ name: "screenPageViews" }, { name: 'activeUsers' }],
      metrics: [{ name: 'eventCount' }, { name: 'screenPageViews' }, { name: 'activeUsers' }],
      // metrics: [{
      //   name: 'activeUsers'
      // }, {
      //   name: 'screenPageViews',
      // }],
      minuteRanges: [{ startMinutesAgo: 1 }]
    });

    return response;
  } catch (error) {
    console.log('erro:', error);
  }
};

const getCPC = (budget: number) => {
  const beehiivBudget = Math.round((budget / ((4 * (1 + 0.10)) / (1 - 0.60))) * 4) - 2;
  return budget / (beehiivBudget / 4);
};

const scrapeFunction = async () => {
  console.log('get from google analytics is running...');
  try {
    const client: BetaAnalyticsDataClient = await initializeClient() as BetaAnalyticsDataClient;
    const propertyId: string = process.env.GOOGLE_ANALYTIC_PROPERTY_ID as string;
    // const response: any = await runReport(client, propertyId);
    const response: any = await runRealtimeReport(client, propertyId);

    if (!response) {
      console.error('Failed to fetch report data');
      return;
    }

    // const result = response.rows.map((item: any) => ({
    //   fullPageUrl: item.dimensionValues[0].value,
    //   totalUsers: item.metricValues[0].value,
    //   sessions: item.metricValues[1].value,
    //   activeUsers: item.metricValues[2].value,
    //   newUsers: item.metricValues[3].value,
    //   screenPageViews: item.metricValues[4].value,
    // }));

    let index = 0;
    for (const item of response.rows) {
      console.log('there is a new data for tracking', item.dimensionValues, item.metricValues);
      const id = encodeURIComponent(item.dimensionValues[0].value);
      if (id.length <= 7) continue;
      const clickCount = Number(index !== 0 ? item.metricValues[1].value : response.rows[0].metricValues[1].value);
      const uniqueClick = Number(index !== 0 ? item.metricValues[2].value : response.rows[0].metricValues[2].value);

      console.log('id:', id, clickCount, uniqueClick);
      const budget = Number((await db.query('SELECT price from campaign where uid = $1', [id])).rows[0].price);
      const addAmount = Math.ceil(Number(getCPC(budget)) * Number(uniqueClick));

      await db.query('UPDATE campaign SET click_count = click_count + $1, unique_clicks = unique_clicks + $2, spent = spent + $3 WHERE uid = $4', [clickCount, uniqueClick, addAmount, id]);
      index++;
    }
  } catch (error) {
    console.log('error:', error);
  }
};

async function dailyAnalyticsUpdate() {
  console.log('Running daily analytics update...');

  // Calculate yesterday's date for the report
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const startDate = yesterday.toISOString().split('T')[0]; // Format as 'YYYY-MM-DD'
  const endDate = startDate; // Same as startDate for daily data

  try {
    const client = await initializeClient() as BetaAnalyticsDataClient;
    const propertyId = process.env.GOOGLE_ANALYTIC_PROPERTY_ID as string;

    const response = await runReport(client, propertyId, startDate, endDate);
    if (!response) {
      console.error('Failed to fetch report data');
      return;
    }

    if (!response || !response.rows) {
      console.error('No data received from runReport');
      return;
    }
    for (const item of response.rows) {
      const pageUrl = item.dimensionValues?.[0]?.value ? encodeURIComponent(item.dimensionValues[0].value) : '';
      const totalUsers = item.metricValues?.[0]?.value ? Number(item.metricValues[0].value) : 0;
      const sessions = item.metricValues?.[1]?.value ? Number(item.metricValues[1].value) : 0;
      const activeUsers = item.metricValues?.[2]?.value ? Number(item.metricValues[2].value) : 0;
      const newUsers = item.metricValues?.[3]?.value ? Number(item.metricValues[3].value) : 0;
      const screenPageViews = item.metricValues?.[4]?.value ? Number(item.metricValues[4].value) : 0;

      console.log('Updating database for URL:', pageUrl, totalUsers, sessions, activeUsers, newUsers, screenPageViews);


    }







  } catch (error) {
    console.error('Error in daily analytics update:', error);
  }
}




const cronFunction = {
  billingFunction,
  mailingFunction,
  scrapeFunction,
  dailyAnalyticsUpdate,
};

export default cronFunction;


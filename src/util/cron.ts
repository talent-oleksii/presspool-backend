import Stripe from 'stripe';
import dotenv from 'dotenv';
import log from './logger';
import db from './db';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

import mailer from './mailer';
import axios from 'axios';
import moment from 'moment';

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
    const activeCampaigns = await db.query('SELECT campaign.id, campaign.name, campaign.price, campaign.email, campaign.billed, campaign.spent, campaign.card_id from campaign LEFT JOIN card_info ON campaign.card_id = card_info.card_id  where state = $1', ['active']);
    for (const campaign of activeCampaigns.rows) {
      // decide how much to bill
      let billAmount = 0;
      if (Number(campaign.spent) > (Number(campaign.price) - Number(campaign.billed))) billAmount = (Number(campaign.price) - Number(campaign.billed)) * 100;
      else billAmount = Number(campaign.spent) * 100;

      if (Number(campaign.billed) >= Number(campaign.price)) billAmount = 0;
      //end
      if (billAmount === 0) continue;
      console.log('billned campaign:', campaign, 'amount:', billAmount);
      let customer;
      const existingCustomers = await stripe.customers.list({ email: campaign.email as string });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({ email: campaign.email as string });
      }

      try {
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
            state: 'weekly',
            campaignName: campaign.name,
          },
          description: `${campaign.name}`,
          confirm: true,
        });
      } catch (error) {
        console.log('error:', error);
        continue;
      }

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
      dimensions: [{ name: 'fullPageUrl' }, { name: 'country' }, { name: 'deviceCategory' }, { name: 'date' }],
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
      // dimensions: [{ name: 'country' }, { name: 'unifiedScreenName' }, { name: 'deviceCategory' }, { name: 'minutesAgo' }],
      dimensions: [{ name: 'unifiedScreenName' }, { name: 'country' }, { name: 'full_url' }],
      metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
      // metrics: [{ name: 'eventCount' }],
      // dimensionFilter: {
      //   filter: { fieldName: 'pageView' }
      // },
      // dimensionFilter: { filter: { fieldName: 'pageLocation' } },
      // dimensionFilter: {
      //   filter: { fieldName: 'pageView' }
      // },
      // metrics: [{
      //   name: 'activeUsers'
      // }, {
      //   name: 'screenPageViews',
      // }],
      minuteRanges: [{ startMinutesAgo: 3 }]
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

    for (const item of response.rows) {
      console.log('there is a new data for tracking', item.dimensionValues, item.metricValues);
      // const id = encodeURIComponent(item.dimensionValues[0].value);
      // if (id.length <= 7) continue;

      const clickCount = item.metricValues[0].value;
      const uniqueClick = item.metricValues[1].value;
      const uid = encodeURIComponent(item.metricValues[0].value);
      continue;
      try {
        if (uid.length > 2) {
          const campaign = await db.query('SELECT price from campaign where uid = $1', [uid]);
          if (campaign.rows.length <= 0) continue;
          const addAmount = Math.ceil(Number(getCPC(5000)) * Number(uniqueClick));

          console.log(`${uid} updated: ${uniqueClick}, ${addAmount}`);

          await db.query('UPDATE campaign SET click_count = click_count + $1, unique_clicks = unique_clicks + $2, spent = spent + $3 WHERE uid = $4', [clickCount, uniqueClick, addAmount, uid]);
        }
      } catch (error: any) {
        console.log('real time report updating error: ', error);
        continue;
      }

      // const clickCount = Number(index !== 0 ? item.metricValues[1].value : response.rows[0].metricValues[1].value);
      // const uniqueClick = Number(index !== 0 ? item.metricValues[2].value : response.rows[0].metricValues[2].value);

      // console.log('id:', id, clickCount, uniqueClick);
      // const budget = Number((await db.query('SELECT price from campaign where uid = $1', [id])).rows[0].price);
      // const addAmount = Math.ceil(Number(getCPC(budget)) * Number(uniqueClick));

      // await db.query('UPDATE campaign SET click_count = click_count + $1, unique_clicks = unique_clicks + $2, spent = spent + $3 WHERE uid = $4', [clickCount, uniqueClick, addAmount, id]);
    }
  } catch (error) {
    console.log('error:', error);
  }
};

async function dailyAnalyticsUpdate() {
  console.log('Running daily analytics update...');

  // Calculate yesterday's date for the report
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const stD = startDate.toISOString().split('T')[0]; // Format as 'YYYY-MM-DD'
  const enD = endDate.toISOString().split('T')[0];

  try {
    const client = await initializeClient() as BetaAnalyticsDataClient;
    const propertyId = process.env.GOOGLE_ANALYTIC_PROPERTY_ID as string;

    const response = await runReport(client, propertyId, stD, enD);
    if (!response) {
      console.error('Failed to fetch report data');
      return;
    }

    if (!response || !response.rows) {
      console.error('No data received from runReport');
      return;
    }
    const campaigns = await db.query('SELECT id, uid FROM campaign');

    for (const campaign of campaigns.rows) {
      let uniqueClicks = 0, totalClicks = 0;
      // await db.query('delete from clicked_history where campaign_id = $1', [campaign.id]);
      for (const item of response.rows) {
        const pageUrl = item.dimensionValues?.[0]?.value ? encodeURIComponent(item.dimensionValues[0].value) : '';
        if (!pageUrl.includes(campaign.uid)) continue;
        const country = item.dimensionValues?.[1]?.value ? item.dimensionValues[1].value : '';
        const device = item.dimensionValues?.[2]?.value ? item.dimensionValues[2].value : '';
        const time = item.dimensionValues?.[3]?.value ? item.dimensionValues[3].value : '';
        const totalUsers = item.metricValues?.[0]?.value ? Number(item.metricValues[0].value) : 0;
        const sessions = item.metricValues?.[1]?.value ? Number(item.metricValues[1].value) : 0;
        const activeUsers = item.metricValues?.[2]?.value ? Number(item.metricValues[2].value) : 0;
        const newUsers = item.metricValues?.[3]?.value ? Number(item.metricValues[3].value) : 0;
        const screenPageViews = item.metricValues?.[4]?.value ? Number(item.metricValues[4].value) : 0;

        const timeOf = moment(time, 'YYYYMMDD').valueOf();
        await db.query('INSERT INTO clicked_history (create_time, ip, campaign_id, device, count) VALUES ($1, $2, $3, $4, $5)', [
          timeOf,
          country,
          campaign.id,
          device,
          screenPageViews
        ]);

        uniqueClicks += Number(totalUsers);
        totalClicks += Number(screenPageViews);
      }
      console.log('camp id:', campaign.id, uniqueClicks, totalClicks);
      await db.query('UPDATE campaign set click_count = click_count + $1, spent = spent + $2, unique_clicks = unique_clicks + $3 WHERE id = $4', [totalClicks, Math.ceil(uniqueClicks * getCPC(5000)), uniqueClicks, campaign.id]);
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


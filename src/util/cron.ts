import Stripe from 'stripe';
import dotenv from 'dotenv';
import log from './logger';
import db from './db';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

import mailer from './mailer';
import moment from 'moment';
import puppeteer from 'puppeteer-extra';
import Stealth from 'puppeteer-extra-plugin-stealth';

puppeteer.use(Stealth());

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
    // const current = moment().hour(0).minute(0).second(0);

    const admins = (await db.query('SELECT * FROM admin_user WHERE role = $1', ['super_admin'])).rows;
    // pay unpaid campaigns
    const activeCampaigns = await db.query('SELECT campaign.start_date, campaign.id, campaign.name, campaign.price, campaign.email, campaign.billed, campaign.spent, campaign.card_id from campaign LEFT JOIN card_info ON campaign.card_id = card_info.card_id  where state = $1', ['active']);
    for (const campaign of activeCampaigns.rows) {
      // const startDate = moment(Number(campaign.start_date)).hour(0).minute(0).second(0);
      // const daysPassed = current.diff(startDate, 'days');
      // if (daysPassed % 14 !== 0) continue;
      // decide how much to bill
      let billAmount = 0;
      if (Number(campaign.spent) - Number(campaign.billed) > (Number(campaign.price) - Number(campaign.billed))) billAmount = (Number(campaign.price) - Number(campaign.billed)) * 100;
      else billAmount = (Number(campaign.spent) - Number(campaign.billed)) * 100;

      if (Number(campaign.billed) >= Number(campaign.price)) billAmount = 0;
      if (Number(campaign.billed) >= Number(campaign.spent)) billAmount = 0;
      //end
      if (billAmount === 0) continue;
      console.log('billned campaign:', campaign, 'amount:', billAmount);
      // continue;
      let customer;
      const existingCustomers = await stripe.customers.list({ email: campaign.email as string });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({ email: campaign.email as string });
      }

      const client = (await db.query('SELECT name, company FROM user_list WHERE email = $1', [campaign.email])).rows[0];

      try {
        await stripe.paymentIntents.create({
          customer: customer.id,
          amount: (billAmount / 100) * 103,
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
          description: `${campaign.name} - $${Math.round(billAmount / 100 * 3) / 100} as fee`,
          confirm: true,
        });
      } catch (error) {
        console.log('error:', error);
        for (const admin of admins) {
          console.log(`send payment intent failed email to admin :${admin.email}`);
          await mailer.sendPaymentFailedEmail(admin.email, campaign.email, client.name, client.company, (billAmount / 100).toString());
        }
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

const payToAccountManagers = async () => {
  console.log('pay to account amangers called');
  try {
    // pay to account managers
    const amVpaid: Array<{ email: string, amount: number, paid: boolean }> = [];
    const balance = await stripe.balance.retrieve();
    const campaigns = (await db.query('SELECT * from campaign WHERE billed > $1', [0])).rows;
    for (const campaign of campaigns) {

      // get client id in the database
      const id = (await db.query('SELECT id FROM user_list WHERE email = $1', [campaign.email])).rows[0];
      const accountManager = (await db.query(
        "SELECT paid, email from admin_user WHERE ',' || assigned_users || ',' LIKE $1",
        [`%,${id.id},%`]
      )).rows[0];

      if (!accountManager) continue;

      const billAmount = Number(campaign.billed) / 10;

      const index = amVpaid.findIndex(item => item.email === accountManager.email);
      if (index > -1) {
        amVpaid[index].amount += billAmount;
      } else {
        amVpaid.push({
          email: accountManager.email,
          amount: billAmount,
          paid: false,
        });
      }
    }

    const accountManagers = (await db.query('SELECT paid, email from admin_user')).rows;
    for (const am of accountManagers) {
      const index = amVpaid.findIndex(item => item.email === am.email);
      if (index > -1) {
        amVpaid[index].amount -= Number(am.paid);
      }
    }

    const accounts = await stripe.accounts.list({ limit: 1000 });
    for (const am of amVpaid) {
      if (am.amount <= 0) continue;
      for (const account of accounts.data) {
        if (account.metadata?.work_email === am.email && am.paid === false) {
          try {
            await stripe.transfers.create({
              amount: am.amount * 100,
              // amount: 100,
              currency: 'usd',
              destination: account.id,
            });

            console.log(`transfer success to ${am.email}`);
            await db.query('UPDATE admin_user SET paid = paid + $1 WHERE email = $2', [am.amount, am.email]);
            am.paid = true;
          } catch (error: any) {
            console.log(`transfer error to account manager ${am.email} `, error);
            continue;
          }
        }
      }
    }
    console.log('after pay:', amVpaid);
  } catch (error) {
    log.error(`pay to account manager error: ${error}`);
  }
};

const payToPublishers = async () => {

  // # We do not pay to beehiiv acount : admin@presspool.ai

  console.log('pay to publishers');
  try {
    const publishers = (await db.query('SELECT publication.publication_id, paid, cpc, email, newsletter, average_unique_click FROM publication LEFT JOIN creator_list ON publication.publisher_id = creator_list.id WHERE publication.state = $1', ['APPROVED'])).rows.map(item => ({
      id: item.publication_id,
      email: item.email,
      cpc: Number(item.cpc),
      newsletter: item.newsletter,
      maxClick: Number(item.average_unique_click),
      paid: Number(item.paid),
    }));

    const payoutList: Array<any> = [];
    const campaigns = (await db.query('SELECT * FROM campaign WHERE use_creator = $1 and state = $2', [1, 'active'])).rows;

    for (const campaign of campaigns) {

      const clickedHistories = (await db.query('SELECT * FROM clicked_history WHERE campaign_id = $1', [campaign.id])).rows;

      for (const publisher of publishers) {
        let clickCount = 0;
        for (const click of clickedHistories) {
          if (publisher.newsletter === click.newsletter_id)
            clickCount += Number(click.unique_click);
        }

        if (clickCount > publisher.maxClick) clickCount = publisher.maxClick;

        // summarize all payouts
        const index = payoutList.findIndex(item => item.email === publisher.email);
        if (index <= -1) {
          payoutList.push({
            email: publisher.email,
            cpc: publisher.cpc,
            click: clickCount,
            paid: publisher.paid,
            id: publisher.id,
          })
        }
        else {
          payoutList.at(index).click += clickCount;
        }
      }
    }

    // Final payment to Publishers
    const accounts = await stripe.accounts.list({ limit: 1000 });
    for (const item of payoutList) {
      // We only pay publishers 80% of full amount.
      if (item.click <= 0) continue;


      // Check if beehiiv account
      if (item.email === 'admin@presspool.ai') {
        await mailer.sendBeehiivPayoutEmail(item.email, item.click * item.cpc * 0.8);
        continue;
      }
      const amount = item.click * item.cpc * 0.8 - item.paid;

      for (const account of accounts.data) {
        if (account.metadata?.work_email === item.email) {
          try {
            await stripe.transfers.create({
              amount: amount * 100,
              // amount: 100,
              currency: 'usd',
              destination: account.id,
            });

            console.log(`transfer success to publisher - ${item.email}`);
            await db.query('UPDATE publication SET paid = paid + $1 WHERE id = $2', [amount, item.id]);
          } catch (error: any) {
            console.log(`transfer error to publisher ${item.email} `, error);
            continue;
          }
        }
      }
    }

  } catch (error) {
    console.log('pay out to publishers error:', error);
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

    // send emails to publishers who didn't finish his onboarding progress
    const publishers = (await db.query('SELECT creator_list.id, name, email FROM publication INNER JOIN creator_list ON publication.publisher_id = creator_list.id WHERE cpc IS NULL and reminder = $1', [0])).rows;
    for (const publisher of publishers) {
      await mailer.sendOnboardingFinishEmail(publisher.name, publisher.email, publisher.id);

      await db.query('UPDATE creator_list set reminder = $1 where id = $2', [1, publisher.id]);
    }


  } catch (error) {
    console.log('error:', error);
  }
};

async function runReport(client: BetaAnalyticsDataClient, propertyId: any, startDate: any, endDate: any) {
  // Function implementation...
  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: startDate, endDate: endDate }],
      dimensions: [{ name: 'fullPageUrl' }, { name: 'country' }, { name: 'deviceCategory' }, { name: 'date' }, { name: 'firstUserMedium' },
      { name: 'firstUserSource' }, { name: 'region' }, { name: 'city' }],
      metrics: [{
        name: 'newUsers'
      }, {
        name: 'screenPageViews',
      }, {
        name: 'userEngagementDuration',
      }],
      // metrics: [{ name: 'sessions' }],
      // dimensions: [{ name: 'country' }]
      limit: 999999999999999,
    });
    return response;
  } catch (e) {
    console.error(`Error running GA4 report: ${e}`);
    return null;
  }
}

const list: Array<any> = [];

const getPageTitle = async (url: string) => {
  try {
    // Launch a headless browser
    const index = list.findIndex(item => item.url === url)
    if (index > -1) return list[index].name;

    const browser = await puppeteer.launch({ headless: true });

    // Open a new page
    const page = await browser.newPage();

    // Navigate to the specified URL
    await page.goto(url);

    // Get the page title
    const title = await page.title();
    console.log('page title:', title);

    // Close the browser
    await browser.close();
    await browser.disconnect();

    list.push({
      url,
      name: title,
    });

    return title;
  } catch (error) {
    list.push({
      url,
      name: ''
    });
    console.error('Error while get page title:', error);
    return '';
  }
}

const updateCreatorStatus = async () => {
  // set campaign status as running for assigned to publishers.
  const creatorHis = await db.query('SELECT id, scheduled_date FROM creator_history WHERE state = $1', ['ACCEPTED']);
  const todayTime = moment().hour(0);
  for (const item of creatorHis.rows) {
    const now = todayTime.valueOf();
    const scheduled = moment.unix(Number(item.scheduled_date)).valueOf();
    const threeDaysLater = moment.unix(Number(item.scheduled_date)).add(3, 'days').valueOf();
    console.log('values:', now, scheduled, threeDaysLater);
    if (moment.unix(Number(item.scheduled_date)).valueOf() <= todayTime.valueOf()) {
      await db.query('UPDATE creator_history SET state = $1 WHERE id = $2', ['RUNNING', item.id]);
    }

    if (todayTime.valueOf() > moment.unix(Number(item.scheduled_date)).add(3, 'days').valueOf()) {
      await db.query('UPDATE creator_history set state = $1 WHERE id = $2', ['FINISHED', item.id]);
    }
  }
};

const dailyAnalyticsUpdate = async () => {
  console.log('Running daily analytics update...');

  // set campaign status as running for assigned to publishers.
  const creatorHis = await db.query('SELECT id, scheduled_date FROM creator_history WHERE state = $1', ['ACCEPTED']);
  const todayTime = moment().hour(0);
  for (const item of creatorHis.rows) {
    if (moment.unix(Number(item.scheduled_date)).valueOf() <= todayTime.valueOf()) {
      await db.query('UPDATE creator_history SET state = $1 WHERE id = $2', ['RUNNING', item.id]);
    }

    if (todayTime.valueOf() > moment.unix(Number(item.scheduled_date)).add(3, 'days').valueOf()) {
      await db.query('UPDATE creator_history set state = $1 WHERE id = $2', ['FINISHED', item.id]);
    }
  }

  // Calculate yesterday's date for the report
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const stD = startDate.toISOString().split('T')[0]; // Format as 'YYYY-MM-DD'
  const enD = endDate.toISOString().split('T')[0];

  try {
    const client = await initializeClient() as BetaAnalyticsDataClient;
    const propertyId = process.env.GOOGLE_ANALYTIC_PROPERTY_ID as string;

    const response = await runReport(client, propertyId, stD, enD);
    // const response = await runReport(client, propertyId, '2024-06-03', enD);
    if (!response) {
      console.error('Failed to fetch report data');
      return;
    }

    if (!response || !response.rows) {
      console.error('No data received from report-function');
      return;
    }

    const publishers = (await db.query('SELECT cpc, newsletter, website_url FROM publication')).rows;

    const getCPC = (newsletter: string) => {
      for (const publisher of publishers) {
        if (!publisher.website_url) continue;
        if (publisher.website_url.indexOf(newsletter) > -1) {
          return Number(publisher.cpc);
        }
      }

      // This means newsletter url does not exist on our 
      return 0;

      // if the campaign is running on beehiiv, the below statement should be runned.
      // return 11;
    }

    const getNewsletterName = (newsletter: string) => {
      if (newsletter === '(direct)') return 'Direct';
      if (newsletter === 'beehiiv' || newsletter === '(not set)' || newsletter === 'aitoolreport.beehiiv.com') return 'Presspool.ai';

      for (const publisher of publishers) {
        if (!publisher.website_url) continue;
        if (publisher.website_url.indexOf(newsletter) > -1) {
          return publisher.newsletter;
        }
      }

      // This means newsletter url does not exist on our database
      return '';
    };

    const campaigns = await db.query('SELECT id, uid, cpc, click_count, price, complete_date FROM campaign');

    for (const campaign of campaigns.rows) {
      let uniqueClicks = 0, totalClicks = 0, verifiedClicks = 0, payAmount = 0;
      // if (Number(campaign.id) !== 254 && Number(campaign.id) !== 259) continue;
      // await db.query('DELETE FROM clicked_history WHERE campaign_id = $1', [campaign.id]);
      for (const item of response.rows) {
        const pageUrl = item.dimensionValues?.[0]?.value ? encodeURIComponent(item.dimensionValues[0].value) : '';
        if (!pageUrl.includes(campaign.uid)) continue;

        const country = item.dimensionValues?.[1]?.value ? item.dimensionValues[1].value : '';
        const device = item.dimensionValues?.[2]?.value ? item.dimensionValues[2].value : '';
        const time = item.dimensionValues?.[3]?.value ? item.dimensionValues[3].value : '';
        const firstUserMedium = item.dimensionValues?.[4]?.value ? item.dimensionValues[4].value : '';
        const firstUserManualContent = item.dimensionValues?.[5]?.value ? item.dimensionValues[5].value : '';
        const firstUserSourceMedium = item.dimensionValues?.[8]?.value ? item.dimensionValues[8].value : '';
        const region = item.dimensionValues?.[6]?.value ? item.dimensionValues[6].value : '';
        const city = item.dimensionValues?.[7]?.value ? item.dimensionValues[7].value : '';
        const totalUsers = item.metricValues?.[0]?.value ? Number(item.metricValues[0].value) : 0;
        const screenPageViews = item.metricValues?.[1]?.value ? Number(item.metricValues[1].value) : 0;
        const userEngagementDuration = item.metricValues?.[2]?.value ? Number(item.metricValues[2].value) : 0;

        const timeOf = moment(time, 'YYYYMMDD').valueOf();

        let title = '';
        title = getNewsletterName(firstUserManualContent);

        if (title === '') {
          if (firstUserManualContent.length > 3 && firstUserManualContent.indexOf('.') > -1) {
            title = await getPageTitle(`https://${firstUserManualContent}`);
          } else if (firstUserManualContent.length > 3 && firstUserManualContent.indexOf('.') === -1) {
            title = firstUserManualContent;
          }
        }

        await db.query('INSERT INTO clicked_history (create_time, ip, campaign_id, device, count, unique_click, duration, user_medium, full_url, newsletter_id, region, city, user_source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)', [
          timeOf,
          country,
          campaign.id,
          device,
          screenPageViews,
          totalUsers,
          userEngagementDuration,
          firstUserMedium,
          item.dimensionValues?.[0]?.value,
          title,
          region,
          city,
          firstUserManualContent
        ]);

        uniqueClicks += Number(totalUsers);
        totalClicks += Number(screenPageViews);
        const cpc = getCPC(firstUserManualContent);
        payAmount += Number(totalUsers) * (cpc ? cpc : 0);
        // verifiedClicks += (firstUserMedium === 'newsletter' || firstUserMedium === 'referral') && userEngagementDuration > screenPageViews * 0.37 ? Number(totalUsers) : 0;
        verifiedClicks = uniqueClicks;

      }

      const oneDay = moment().add(-1, 'day').valueOf();
      const now = moment().valueOf();
      if (Number(campaign.click_count) === 0 && totalClicks > 0) {
        await db.query('UPDATE campaign SET start_date = $1 WHERE id = $2', [oneDay, campaign.id]);
      } else {
        await db.query('UPDATE campaign SET start_date = create_time WHERE id = $1', [campaign.id]);
      }

      if (Math.ceil(verifiedClicks * Number(campaign.cpc)) >= Number(campaign.price) && !campaign.complete_date) {
        await db.query('UPDATE campaign SET complete_date = $1 where id = $2', [now, campaign.id]);
      }
      // await db.query('UPDATE campaign set click_count = $1, spent = $2, unique_clicks = $3 WHERE id = $4', [totalClicks, Math.ceil(payAmount * 2), uniqueClicks, campaign.id]);

      // This multiply 2.5 is for our campaign budget.
      await db.query('UPDATE campaign set click_count = click_count + $1, spent = spent + $2, unique_clicks = unique_clicks + $3 WHERE id = $4', [totalClicks, Math.ceil(payAmount * 2), uniqueClicks, campaign.id]);

      console.log(`update finished for campaign:${campaign.id}`);
    }

  } catch (error) {
    console.error('Error in daily analytics update:', error);
  }
}




const cronFunction = {
  billingFunction,
  mailingFunction,
  dailyAnalyticsUpdate,
  updateCreatorStatus,
  payToAccountManagers,

  payToPublishers,

  getPageTitle,
};

export default cronFunction;


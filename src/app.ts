import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { StatusCodes } from 'http-status-codes';
import cron from 'node-cron';
import AWS from 'aws-sdk';

import authRoute from './routes/authRoute';
import dataRoute from './routes/dataRoute';
import stripeRoute from './routes/stripeRoute';
import adminRoute from './routes/adminRoute';
import creatorRoute from './routes/creatorRoute';

import cronFunction from './util/cron';

dotenv.config({ path: './.env' });

import db from './util/db';
import log from './util/logger';
import mailer from './util/mailer';
import data from './controller/dataController';

AWS.config.update({
    region: 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY as string,
        secretAccessKey: process.env.AWS_SECRET_KEY as string,
    }
});


const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.use(express.static(__dirname + '/public/img'));
app.get('/image', function (req, res) {
    const filePath = `${__dirname}/public/img/${req.query.image}`;
    res.sendFile(filePath);
});

app.use('/stripe', stripeRoute);

app.use('/auth', authRoute);
app.use('/data', dataRoute);
app.use('/admin', adminRoute);
app.use('/creator', creatorRoute);

app.get('/', (_req, res) => {
    return res.status(StatusCodes.OK).send('API is running');
});

app.listen(PORT, async () => {
    log.info(`Server is running on PORT:${PORT}`);
    await db.testConnection();

    // await cronFunction.dailyAnalyticsUpdate();
    // await cronFunction.payToPublishers();
});


// campaign to be paid every 14 days.
cron.schedule('0 0 * * 5', async () => { // minute, hour, day, month, day_of_week
    // cron.schedule('*/30 * * * * *', async () => {
    await cronFunction.billingFunction();
});

cron.schedule('0 0 * * 5', async () => {
    // cron.schedule('*/30 * * * * *', async () => {
    await cronFunction.payToAccountManagers();

    await cronFunction.payToPublishers();
});

// This is for email triggering
cron.schedule('1 0 * * *', async () => {
    // console.log('mailing called');
    await cronFunction.mailingFunction();
});

//This should be opened before deploy
// cron.schedule('*/3 * * * *', async () => {
//     await cronFunction.scrapeFunction();
// });

// publish remote.com's EOR campaign by force
// data.publishCampaign('jared@metabase.com', 254, 284);

// mailer.generateToken();
// mailer.sendCampaignRequestToCreator('oleksii@presspool.ai', 'Oleksii Karavanov', 'New Age');
// mailer.sendPaymentFailedEmail('oleksii@presspool.ai ', 'Oleksii@presspool.ai', 'TEST', '10000');

cron.schedule('10 20 * * *', async () => {
    await cronFunction.dailyAnalyticsUpdate();
    await cronFunction.updateCreatorStatus();
});

// mailer.sendCampaignRequestToCreator('kyle@aitoolreport.com', 'Kyle Mair');

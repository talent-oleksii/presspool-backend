import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { StatusCodes } from 'http-status-codes';
import cron from 'node-cron';

import authRoute from './routes/authRoute';
import dataRoute from './routes/dataRoute';
import stripeRoute from './routes/stripeRoute';
import adminRoute from './routes/adminRoute';

import cronFunction from './util/cron';

dotenv.config({ path: './.env' });

import db from './util/db';
import log from './util/logger';


const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use('/stripe', stripeRoute);
// app.post('/stripe/purchase', stripe.purchaseCampaign);

app.use('/auth', authRoute);
app.use('/data', dataRoute);

app.use('/admin', adminRoute);

app.get('/', (_req, res) => {
    return res.status(StatusCodes.OK).send('API is running');
});

app.listen(PORT, async () => {
    log.info(`Server is running on PORT:${PORT}`);
    await db.testConnection();
});

cron.schedule('55 17 * * 1', async () => { // minute, hour, day, month, day_of_week
    console.log('if this started');
    await cronFunction();
});
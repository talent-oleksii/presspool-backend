import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { StatusCodes } from 'http-status-codes';
import cron from 'node-cron';
import AWS from 'aws-sdk';

import CryptoJS from 'crypto-js';

import authRoute from './routes/authRoute';
import dataRoute from './routes/dataRoute';
import stripeRoute from './routes/stripeRoute';
import adminRoute from './routes/adminRoute';

import cronFunction from './util/cron';

dotenv.config({ path: './.env' });

import db from './util/db';
import log from './util/logger';

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

app.get('/', (_req, res) => {
    return res.status(StatusCodes.OK).send('API is running');
});

app.listen(PORT, async () => {
    log.info(`Server is running on PORT:${PORT}`);
    await db.testConnection();
});

const encrypt = async (plaintext: string) => {
    var encrypted = CryptoJS.AES.encrypt(plaintext, "presspool_aes_key");
    console.log('dr:', encodeURIComponent(encrypted.toString()));
    var decrypted = CryptoJS.AES.decrypt(encrypted, "presspool_aes_key").toString(CryptoJS.enc.Utf8);
    console.log('dd:', decrypted);
};

encrypt('https://www.website.com');

// This is to charge bill to clients by every friday
cron.schedule('0 0 * * 5', async () => { // minute, hour, day, month, day_of_week
    await cronFunction.billingFunction();
});

// This is for email triggering
cron.schedule('1 0 * * *', async () => {
    console.log('mailing called');
    await cronFunction.mailingFunction();
});

cron.schedule('*/10 * * * * *', async () => {
    await cronFunction.scrapeFunction();
});
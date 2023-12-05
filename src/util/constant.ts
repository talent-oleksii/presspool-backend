import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { google } from 'googleapis';

const smtpTransport = require('nodemailer-smtp-transport');

dotenv.config({ path: './.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET as string);

const oAuth2Client = new google.auth.OAuth2(
  "268206964271-g43jvvltpa0caie8efusf252ejefdij3.apps.googleusercontent.com",
  "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",
  "https://localhost:3000",
);

// const emailTransporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     type: 'OAuth2',
//     user: process.env.SERVER_EMAIL,
//     clientId: "268206964271-g43jvvltpa0caie8efusf252ejefdij3.apps.googleusercontent.com",
//     clientSecret: "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",
//     // refreshToken: '',
//     // accessToken: oAuth2Client.getAccessToken(),
//     // pass: process.env.EMAIL_PASSWORD,
//   }
// });

const constant = {
  stripe,
};

export default constant;
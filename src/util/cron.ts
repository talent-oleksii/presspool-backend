import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import log from './logger';

dotenv.config({ path: './.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET as string);

const transpoter = nodemailer.createTransport({
  service: 'gmail',
  secure: false,
  auth: {
    user: process.env.SERVER_EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  }
});

const cronFunction = async () => { // Here we notify users about billing
  try {
    // const mailOptions = {
    //   from: process.env.SERVER_EMAIL,
    //   to: 'oleksiikaravanov@gmail.com',
    //   subject: 'Billing Information',
    //   text: "Thanks for joining at PressPool AI. it's time to bill your campaign."
    // };
    // await transpoter.sendMail(mailOptions);

    const email = 'oleksiikaravanov@gmail.com';
    const list = await stripe.customers.list({ email });
    console.log('list:', list);

    const customer = await stripe.customers.create({
      email,
      source: 'src_1OH7yRFx5HbKLtp4jR8kER4c',
    });

    await stripe.charges.create({
      amount: 523000,
      currency: 'usd',
      customer: customer.id,
      source: 'src_1OH7yRFx5HbKLtp4jR8kER4c',
    });

    // const paymentMethod = await stripe.paymentMethods.create({
    //   // customer: customer.id,
    //   type: 'card',
    //   card: {
    //     token: 'tok_1OH78JFx5HbKLtp4vpQaS82Q',
    //   }
    // });

    // const price = await stripe.prices.create({
    //   currency: 'usd',
    //   unit_amount: 500000,
    //   product_data: {
    //     name: 'PressPool Campaign Data',
    //   }
    // });

    // const invoice = await stripe.invoices.create({
    //   customer: customer.id,
    //   collection_method: "charge_automatically",
    //   currency: "usd",
    //   default_payment_method: paymentMethod.id
    // });

    // const invoiceItem = await stripe.invoiceItems.create({
    //   customer: customer.id,
    //   price: price.id,
    //   invoice: invoice.id
    // });

    // await stripe.invoices.pay(invoice.id);
  } catch (error) {
    log.error(`error: ${error}`);
  }

};

export default cronFunction;
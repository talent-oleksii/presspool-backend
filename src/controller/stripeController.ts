import moment from "moment";
import Stripe from 'stripe';
import { RequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";
import constant from "../util/constant";

import db from "../util/db";
import log from "../util/logger";
import mailer from "../util/mailer";

const preparePayment: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { email, campaignId } = req.body;
    const time = moment().valueOf();
    await db.query(
      "update campaign set state = 'purchasing', create_time = $1 where email = $2 and id = $3",
      [time, email, campaignId]
    );

    return res.status(StatusCodes.OK).json("Ready to Purchase");
  } catch (error) {
    log.error(`error while preparing purchasing: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

const getCard: RequestHandler = async (req: Request, res: Response) => {
  log.info("get card info called");
  try {
    const { email } = req.query;
    let customer;
    const existingCustomers = await constant.stripe.customers.list({
      email: email as string,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await constant.stripe.customers.create({
        email: email as string,
      });
    }

    const cards = await db.query(
      "select * from card_info where customer_id = $1",
      [customer.id]
    );

    return res.status(StatusCodes.OK).json(cards.rows);
  } catch (error) {
    log.error(`error while getting card: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

const addCard: RequestHandler = async (req: Request, res: Response) => {
  log.info("add card called");
  try {
    const { email, token, source } = req.body;
    const time = moment().valueOf();

    const result = await db.query(
      `insert into card_info (email, token_id, card_id, last4, card_name, exp_month, exp_year, brand, zip, create_time, source_id, client_secret)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      returning *`,
      [
        email,
        token.id,
        token.card.id,
        token.card.last4,
        token.card.name,
        token.card.exp_month,
        token.card.exp_year,
        token.card.brand,
        token.card.address_zip,
        time,
        source.id,
        source.client_secret,
      ]
    );
    return res.status(StatusCodes.OK).json(result.rows[0]);
  } catch (error) {
    log.error(`error while adding card: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

const deleteCard: RequestHandler = async (req: Request, res: Response) => {
  log.info("delete card called");
  try {
    const { id } = req.query;
    await db.query("delete from card_info where id = $1", [id]);
    return res.status(StatusCodes.OK).send("successfully deleted");
  } catch (error) {
    log.error(`error while deleting card: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

const purchaseCampaign: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    console.log("purchase called:", req.body);
    const object = req.body.data.object;
    const amount = object.amount_received;

    log.info(`${amount} purchased`);

    if (object.metadata.state === "unbilled") {
      await db.query("UPDATE campaign set billed = spent where email = $1", [
        object.receipt_email,
      ]);

      return res.status(StatusCodes.OK).json("successfully purchased");
    } else if (object.metadata.state === "weekly") {
      console.log("meta data campaign name:", object.metadata.camapignName);
      const user = await db.query(
        "select name from user_list where email = $1",
        [object.receipt_email]
      );

      const campaigns = await db.query(
        "SELECT * from campaign WHERE email = $1 and state = $2",
        [object.receipt_email, "active"]
      );
      const clickedHistoryQuery =
        "SELECT * FROM clicked_history WHERE campaign_id = ANY($1)";
      const { rows: clickedHistory } = await db.query(clickedHistoryQuery, [
        campaigns.rows.map((item) => Number(item.id)),
      ]);

      const data = campaigns.rows.map((item) => {
        const verifiedClick = clickedHistory
          .filter((x) => x.campaign_id === item.id)
          .reduce(
            (prev, item) =>
              prev +
              Number(
                (item?.user_medium === "newsletter" || item?.user_medium === 'referral') && item?.duration > item?.count * 1.2
                  ? item?.unique_click
                  : 0
              ),
            0
          );

        const avgCPC =
          item.price === 0 || verifiedClick === 0
            ? 0
            : item.price / verifiedClick > 10
              ? 10
              : Number(item.price / verifiedClick);

        let sumEmail = 0;
        let sumBlog = 0;
        clickedHistory
          .filter((x) => x.campaign_id === item.id)
          .forEach((item) => {
            if (item.user_medium === "newsletter") {
              sumEmail += Number(item.unique_click);
            } else if (item.user_medium === "referral") {
              sumBlog += Number(item.unique_click);
            }
          });

        const groupedByCountry = groupByAndSumCountOnCountry(
          clickedHistory.filter((x) => x.campaign_id === item.id)
        );

        return {
          name: item.name,
          totalClick: item.click_count,
          upTotalClick: 0,
          uniqueClick: item.unique_clicks,
          upUniqueClick: 0,
          totalSpent: avgCPC * verifiedClick,
          upTotalSpent: 0,
          avgCPC: avgCPC.toFixed(2),
          upAvgCPC: 0,
          verifiedClick,
          upVerifiedClick: 0,
          sumEmail,
          sumBlog,
          groupedByCountry: groupedByCountry.slice(0, Math.min(groupedByCountry.length, 3))
        };
      });

      await mailer.sendPurchaseEmail(
        object.receipt_email,
        user.rows[0].name,
        data
      );

      await db.query("update user_list set verified = 1 where email = $1", [
        object.receipt_email,
      ]);

      return res.status(StatusCodes.OK).json("successfully purchased");
    }
  } catch (error: any) {
    log.error(`purchase confirm error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
  }
};

const addBillingMethod: RequestHandler = async (
  req: Request,
  res: Response
) => {
  console.log("billing method:");
  try {
    const data = req.body.data;

    if (req.body.type === "payment_method.attached") {
      // payment method attached.
      await db.query(
        `insert into card_info (customer_id, card_id, last4, brand, create_time)
      values ($1, $2, $3, $4, $5)`,
        [
          data.object.customer,
          data.object.id,
          data.object.card.last4 ? data.object.card.last4 : "****",
          data.object.card.brand,
          req.body.created,
        ]
      );

      return res.status(StatusCodes.OK).json("attached");
    } else if (req.body.type === "payment_method.detached") {
      const customerId = (await db.query('SELECT customer_id FROM card_info WHERE card_id = $1', [data.object.id])).rows[0];
      const customerDetail = await constant.stripe.customers.retrieve(customerId.customer_id) as Stripe.Customer;

      const client = (await db.query('SELECT * FROM user_list WHERE email = $1', [customerDetail.email])).rows[0];

      // check out if payment methods are none
      // if (Number(count.count) <= 0) {
      //send email to super admins
      const superAdmins = await db.query('SELECT * FROM admin_user WHERE role = $1', ['super_admin']);

      for (const admin of superAdmins.rows) {
        mailer.sendPaymentMethodDetachedEmail(admin.email, customerDetail.email || '', client.name);
      }
      // }


      await db.query("delete from card_info where card_id = $1", [
        data.object.id,
      ]);

      return res.status(StatusCodes.OK).json("detached");
    }
  } catch (error: any) {
    console.log('billing method function error:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
  }
};


const accountUpdated = async (req: Request, res: Response) => {
  console.log('account updated called');
  try {
    const data = req.body.data;
    const sig = req.headers['stripe-signature'] as string;

    const endpointSecret = 'whsec_B3wELkfEcyIQeZ5wfh0hWUQp5IdKVqMs';

    let event;
    event = constant.stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

    console.log("event:", event);
  } catch (error: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
  }
};

const groupByAndSumCountOnCountry = (clicked: any[]) => {
  const ipCounts: { [x: string]: { total: number } } = {};
  clicked.forEach((item: any) => {
    const ip = item.ip;
    const count = item.count;

    if (!ipCounts[ip]) {
      ipCounts[ip] = { total: 0 };
    }
    ipCounts[ip].total += count;
  });
  const totalSum = Object.values(ipCounts).reduce(
    (acc: any, { total }: any) => acc + total,
    0
  );

  const result = [];
  for (const [ip, { total }] of Object.entries(ipCounts)) {
    const percentage = ((total / totalSum) * 100).toFixed(2);
    result.push({ ip, total, percentage, color: generateColor() });
  }
  return result;
};

const generateColor = () => {
  return "#" + Math.random().toString(16).substr(-6);
};

const stripeFunction = {
  purchaseCampaign,
  addBillingMethod,
  accountUpdated,

  preparePayment,
  getCard,
  addCard,
  deleteCard,
};

export default stripeFunction;

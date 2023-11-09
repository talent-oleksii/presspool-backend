import moment from 'moment';
import { RequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";

import db from '../util/db';
import log from '../util/logger';

const preparePayment: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { email, campaignId } = req.body;
    const time = moment().valueOf();
    console.log('time:', time);
    await db.query("update campaign set state = 'purchasing', create_time = $1 where email = $2 and id = $3", [time, email, campaignId]);

    return res.status(StatusCodes.OK).json('Ready to Purchase');
  } catch (error) {
    log.error(`error while preparing purchasing: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

const purchaseCampaign: RequestHandler = async (req: Request, res: Response) => {
  try {
    console.log('req.body:', req.body);

    const object = req.body.data.object;
    const amount = object.amount;

    console.log('values:', object.billing_details.email, object.id,);

    await db.query('insert into pay_history(email, pay_id, pay_amount, create_time) values ($1, $2, $3, $4)', [
      object.billing_details.email,
      object.id,
      Number(amount) / 100,
      req.body.created
    ]);

    log.info(`${amount} purchased`);
    const payData = await db.query("select id from campaign where email = $1 and state = 'purchasing' order by create_time desc", [object.billing_details.email]);
    if (payData.rows.length <= 0) {
      return res.status(StatusCodes.OK).json('no matching campaign id');
    }
    const campaignId = payData.rows[0].id;

    await db.query("update campaign set state = 'purchased', price = $1 where id = $2", [Number(amount) / 100, campaignId]);

    return res.status(StatusCodes.OK).json('successfully purchased');
  } catch (error: any) {
    log.error(`purchase confirm error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
  }
};

const stripeFunction = {
  purchaseCampaign,
  preparePayment,
};

export default stripeFunction;
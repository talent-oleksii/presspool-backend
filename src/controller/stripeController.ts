import moment from 'moment';
import { RequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";

import db from '../util/db';
import log from '../util/logger';
import mailer from '../util/mailer';

const preparePayment: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { email, campaignId } = req.body;
    const time = moment().valueOf();
    await db.query("update campaign set state = 'purchasing', create_time = $1 where email = $2 and id = $3", [time, email, campaignId]);

    return res.status(StatusCodes.OK).json('Ready to Purchase');
  } catch (error) {
    log.error(`error while preparing purchasing: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

const getCard: RequestHandler = async (req: Request, res: Response) => {
  log.info('get card info called');
  try {
    const { email } = req.query;
    const cards = await db.query('select * from card_info where email = $1', [email]);

    return res.status(StatusCodes.OK).json(cards.rows);

  } catch (error) {
    log.error(`error while getting card: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

const addCard: RequestHandler = async (req: Request, res: Response) => {
  log.info('add card called');
  try {
    const { email, token, source } = req.body;
    const time = moment().valueOf();

    const result = await db.query(`insert into card_info (email, token_id, card_id, last4, card_name, exp_month, exp_year, brand, zip, create_time, source_id, client_secret)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      returning *`,
      [email, token.id, token.card.id, token.card.last4, token.card.name, token.card.exp_month, token.card.exp_year, token.card.brand, token.card.address_zip, time, source.id, source.client_secret]
    );
    return res.status(StatusCodes.OK).json(result.rows[0]);

  } catch (error) {
    log.error(`error while adding card: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

const deleteCard: RequestHandler = async (req: Request, res: Response) => {
  log.info('delete card called');
  try {
    const { id } = req.query;
    await db.query('delete from card_info where id = $1', [id]);
    return res.status(StatusCodes.OK).send('successfully deleted');
  } catch (error) {
    log.error(`error while deleting card: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

const purchaseCampaign: RequestHandler = async (req: Request, res: Response) => {
  try {
    log.info('purchase called:');
    console.log('ddd:', req.body.data.object.description);
    const object = req.body.data.object;
    const amount = object.amount;

    // await db.query('insert into pay_history(email, pay_id, pay_amount, create_time) values ($1, $2, $3, $4)', [
    //   object.billing_details.email,
    //   object.id,
    //   Number(amount) / 100,
    //   req.body.created
    // ]);

    log.info(`${amount} purchased`);
    // const payData = await db.query("select id from campaign where email = $1 and state = 'purchasing' order by create_time desc", [object.billing_details.email]);
    // if (payData.rows.length <= 0) {
    //   return res.status(StatusCodes.OK).json('no matching campaign id');
    // }
    // const campaignId = payData.rows[0].id;

    // await db.query("update campaign set state = 'purchased' where id = $1", [campaignId]);
    console.log('ddd:', object.billing_details.email);
    await mailer.sendPurchaseEmail(object.billing_details.email, `${object.description}, ${amount / 100} has purchased, check billing information: ${object.receipt_url}`);
    await db.query('update user_list set verified = 1 where email = $1', [object.billing_details.email]);

    return res.status(StatusCodes.OK).json('successfully purchased');
  } catch (error: any) {
    log.error(`purchase confirm error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
  }
};

const stripeFunction = {
  purchaseCampaign,
  preparePayment,
  getCard,
  addCard,
  deleteCard,
};

export default stripeFunction;
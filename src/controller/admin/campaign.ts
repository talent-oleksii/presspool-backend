import { RequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import db from '../../util/db';
import log from "../../util/logger";

const getCampaign: RequestHandler = async (req: Request, res: Response) => {
  try {
    log.info('get admin campaign called');
    const { searchKey } = req.query;

    const result = await db.query('select * from campaign where name like $1', [`%${searchKey}%`]);

    return res.status(StatusCodes.OK).json(result.rows);
  } catch (error: any) {
    log.error(`error: ${error}`)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const campaign = {
  getCampaign
};

export default campaign;
import { RequestHandler, Request, Response } from 'express';

import db from '../../util/db';
import { StatusCodes } from 'http-status-codes';

const getAccountManagers: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const assigners = await db.query('SELECT * from admin_user WHERE role = $1', ['account_manager']);

    return res.status(StatusCodes.OK).json(assigners.rows);
  } catch (error: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const assignAccountManager: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { userId, manager } = req.body;
    console.log('data:', userId, manager);

    return res.status(StatusCodes.OK).json({});
  } catch (error: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const adminUser = {
  getAccountManagers,
  assignAccountManager,
};

export default adminUser;
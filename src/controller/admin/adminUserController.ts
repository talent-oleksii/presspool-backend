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

    const origin = (await db.query('SELECT assigned_users from admin_user where id = $1', [manager])).rows[0].assigned_users;
    if (!origin || origin.length <= 0) {
      const ret = await db.query('UPDATE admin_user SET assigned_users = $1 where id = $2 RETURNING *', [`${userId}`, manager]);
      return res.status(StatusCodes.OK).json(ret.rows[0]);
    } else {
      const ids = origin.split(',');
      if (ids.includes(userId.toString())) {
        return res.status(StatusCodes.BAD_REQUEST).json('That user is already assigned');
      } else {
        const ret = await db.query('UPDATE admin_user SET assigned_users = $1 where id = $2 RETURNING *', [`${origin},${userId}`, manager]);
        return res.status(StatusCodes.OK).json(ret.rows[0]);
      }
    }
  } catch (error: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const unassignAccountManager: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { userId, manager } = req.body;
    console.log('id:', userId, manager);

    const origin = (await db.query('SELECT assigned_users from admin_user where id = $1', [manager])).rows[0].assigned_users;
    let ids = origin.split(',');

    ids = ids.filter((item: any) => item !== userId.toString());
    console.log('ids:', ids);
    await db.query('UPDATE admin_user SET assigned_users = $1 where id = $2', [ids.join(','), manager]);
    return res.status(StatusCodes.OK).json('unassigned');
  } catch (error: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const adminUser = {
  getAccountManagers,
  assignAccountManager,
  unassignAccountManager,
};

export default adminUser;
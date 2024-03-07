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

const getNormalUsers: RequestHandler = async (req: Request, res: Response) => {
  console.log('get normal user:');
  try {
    const { accountManager } = req.query;
    let users: any = undefined;
    if (accountManager) {
      const assignedUsers = await db.query('SELECT assigned_users FROM admin_user WHERE id = $1', [accountManager]);
      if (assignedUsers.rows[0].assigned_users) {
        const arr = assignedUsers.rows[0].assigned_users.split(',');
        users = await db.query('SELECT * from user_list WHERE id = ANY($1)', [arr]);
      } else {
        users = {
          rows: []
        };
      }

    } else {
      users = await db.query('SELECT * from user_list');
    }

    return res.status(StatusCodes.OK).json(users.rows);
  } catch (error: any) {
    console.log('error getting normal user:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const updateAssigners: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    console.log('data:', data);

    for (const item of data) {
      await db.query('UPDATE admin_user SET assigned_users = $1 where id = $2', [item.assigned_users, item.id]);
    }

    return res.status(StatusCodes.OK).json('updated!');
  } catch (error: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const adminUser = {
  getAccountManagers,
  assignAccountManager,
  unassignAccountManager,
  getNormalUsers,
  updateAssigners,
};

export default adminUser;
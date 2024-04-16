import { RequestHandler, Request, Response } from 'express';
import { verify, sign } from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes/build/cjs/status-codes';

import db from '../../util/db';

const login: RequestHandler = async (req: Request, res: Response) => {
  console.log('creator login api called');
  try {
    const { email, password } = req.body;
    const user = await db.query('SELECT password FROM creator_list WHERE email = $1', [email]);
  } catch (error: any) {
    console.log('creator login error: ', error.message);

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const authController = {
  login
};

export default authController;
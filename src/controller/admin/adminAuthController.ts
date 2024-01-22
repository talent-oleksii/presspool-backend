import { RequestHandler, Request, Response } from "express";
import { verify, sign, JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";

import moment from 'moment';
import db from "../../util/db";

const secretKey = "presspool-admin-ai";
const generateToken = (payload: any) => {
  const token = sign(payload, secretKey, { expiresIn: '1d' });
  return token;
};

const authCheck: RequestHandler = async (req: Request, res: Response) => {
  console.log('admin auth check called');

  try {
    const tokenHeader = req.headers.authorization;
    const token = tokenHeader && tokenHeader.split(' ')[1];

    const result: JwtPayload = verify(token as string, secretKey) as JwtPayload;

    if (!result || !result.exp || !result.iat) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'JWT error' });
    }

    if (result.exp < result.iat) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Token expired!' });
    } else {
      const user = await db.query('select * from admin_user where email = $1', [result.email]);
      if (user.rows.length <= 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'User not exist!' });
      }
      return res.status(StatusCodes.OK).json({ ...user.rows[0], token });
    }
  } catch (error: any) {
    console.log(`admin auth check fail: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

const signIn: RequestHandler = async (req: Request, res: Response) => {
  console.log("admin Sign in api called");
  try {
    const { email, password } = req.body;

    const user = await db.query('select * from admin_user where email = $1 and password = $2', [email, password]);
    if (user.rows.length <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Log In Information Incorrect!' });
    }

    const token = generateToken({ email });

    return res.status(StatusCodes.OK).json({
      ...user.rows[0],
      token
    });
  } catch (error: any) {
    console.log('admin sign in error: ', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const signUp: RequestHandler = async (req: Request, res: Response) => {
  console.log('admkin sign up api called');
  try {
    const { email, fullName, password, link } = req.body;
    const now = moment().valueOf();

    const data = await db.query('INSERT INTO admin_user (email, name, password, create_time, role, link) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [email, fullName, password, now, 'account_manager', link]);
    const token = generateToken({ email });

    return res.status(StatusCodes.OK).json({
      ...data.rows[0],
      token,
    });
  } catch (error: any) {
    console.log('admin sign up error:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const adminAuth = {
  authCheck,
  signIn,
  signUp,
};

export default adminAuth;
import { RequestHandler, Request, Response } from "express";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";

import db from "../../util/db";
import { generateToken } from "../../util/common";
import moment from "moment";
import mailer from "../../util/mailer";

const login: RequestHandler = async (req: Request, res: Response) => {
  console.log("creator login api called");
  try {
    const { email, password } = req.body;
    const { rows } = await db.query(
      "SELECT * FROM creator_list WHERE email = $1",
      [email]
    );
    if (rows.length > 0) {
      const [user] = rows;
      const { password: existingPassword, ...rest } = user;
      if (bcrypt.compareSync(password, existingPassword)) {
        const token = generateToken({
          id: rest.id,
          email,
          role: rest.user_type,
        });
        return res.status(StatusCodes.OK).json({
          ...rest,
          token,
        });
      } else {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: `Invalid credentials` });
      }
    } else {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: `User with email: ${email} not exists` });
    }
  } catch (error: any) {
    console.log("creator login error: ", error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const signup: RequestHandler = async (req: Request, res: Response) => {
  console.log("creator signup api called");
  try {
    const { fullName, email, password, newsletter } = req.body;
    const { rows } = await db.query(
      "SELECT * FROM creator_list WHERE email = $1",
      [email]
    );
    if (rows.length >= 1) {
      return res
        .status(StatusCodes.CONFLICT)
        .json({ message: `Creator with email: ${email} already exists` });
    } else {
      const hash = bcrypt.hashSync(password.toString(), 10);
      const time = moment().valueOf();
      const { rows } = await db.query(
        "insert into creator_list (create_time, name, email, password, newsletter, verified, user_type, email_verified) values ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
        [time, fullName, email, hash, newsletter, 0, "creator", 0]
      );
      await mailer.sendCreatorWelcomeEmail(email, fullName, {
        creatorId: rows[0].id,
        token: generateToken({ email }),
      });
      return res.status(StatusCodes.OK).json({
        ...rows[0],
        verified: 0,
        email_verified: 0,
        token: generateToken({ email }),
      });
    }
  } catch (error: any) {
    console.log("creator login error: ", error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const authController = {
  login,
  signup,
};

export default authController;

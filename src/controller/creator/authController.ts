import { RequestHandler, Request, Response } from "express";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";

import db from "../../util/db";
import { generateRandomNumbers, generateToken } from "../../util/common";
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
        .json({ message: `Publisher with email: ${email} not exists` });
    }
  } catch (error: any) {
    console.log("Publisher login error: ", error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const signup: RequestHandler = async (req: Request, res: Response) => {
  console.log("creator signup api called");
  try {
    const { fullName, email, password, newsletter, website_url } = req.body;
    const { rows } = await db.query(
      "SELECT * FROM creator_list WHERE email = $1",
      [email]
    );
    if (rows.length >= 1) {
      return res
        .status(StatusCodes.CONFLICT)
        .json({ message: `Publisher with email: ${email} already exists` });
    } else {
      const hash = bcrypt.hashSync(password.toString(), 10);
      const time = moment().valueOf();
      const { rows } = await db.query(
        "insert into creator_list (create_time, name, email, password, verified, user_type, email_verified) values ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [time, fullName, email, hash, 0, "creator", 1]
      );
      await db.query(
        "insert into publication (create_time, newsletter, website_url, publisher_id, state) values ($1, $2, $3,$4,$5) RETURNING *",
        [time, newsletter, website_url, rows[0].id, "PENDING"]
      );
      const token = generateToken({
        id: rows[0].id,
        email,
        role: rows[0].user_type,
      });
      // await mailer.sendCreatorWelcomeEmail(email, fullName, {
      //   creatorId: rows[0].id,
      //   token: generateToken({ email, expiresIn: "30d" }),
      // });
      return res.status(StatusCodes.OK).json({
        ...rows[0],
        token,
      });
    }
  } catch (error: any) {
    console.log("creator login error: ", error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const getCreatorDetail: RequestHandler = async (
  req: Request,
  res: Response
) => {
  console.log("creator login api called");
  try {
    const { creatorId } = req.query;
    const { rows } = await db.query(
      "SELECT * FROM creator_list WHERE id = $1",
      [creatorId]
    );
    if (rows.length > 0) {
      const [user] = rows;
      const { password: existingPassword, ...rest } = user;
      return res.status(StatusCodes.OK).json({
        ...rest,
      });
    } else {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: `Creator detail not exists` });
    }
  } catch (error: any) {
    console.log("creator login error: ", error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const sendPasswordEmail: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { email } = req.body;

    const isExist = await db.query(
      "select * from creator_list where email = $1",
      [email]
    );

    if (isExist.rows.length <= 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "The email does not exist. Please Sign Up first" });
    }

    const random = generateRandomNumbers(5);
    await db.query(
      "UPDATE creator_list set password_reset = $1 where email = $2",
      [random, email]
    );
    mailer.sendForgotPasswordEmail(email, random, isExist.rows[0].name);
    return res
      .status(StatusCodes.OK)
      .json({ message: "Password Reset email sent!" });
  } catch (error: any) {
    console.log("error:", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const verifyPasswordEmail: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { email, code } = req.body;

    const isSame = await db.query(
      "SELECT * from creator_list where email = $1 and password_reset = $2 ",
      [email, code]
    );
    if (isSame.rows.length <= 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Code is not valid" });
    }
    return res.status(StatusCodes.OK).json("ok");
  } catch (error: any) {
    console.log("error:", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const changePassword: RequestHandler = async (req: Request, res: Response) => {
  console.log("password reset called");
  try {
    const { email, password } = req.body;
    console.log("eee:", email, password);
    const hash = bcrypt.hashSync(password.toString(), 10);
    await db.query("UPDATE creator_list set password = $1 where email = $2", [
      hash,
      email,
    ]);

    return res.status(StatusCodes.OK).json("ok");
  } catch (error: any) {
    console.log("error:", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const authController = {
  login,
  signup,
  getCreatorDetail,
  sendPasswordEmail,
  verifyPasswordEmail,
  changePassword,
};

export default authController;

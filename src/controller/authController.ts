import { RequestHandler, Request, Response } from "express";
import { verify, sign, JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";

import moment from 'moment';
import db from "../util/db";
import useAirTable from "../util/useAirTable";
import log from "../util/logger";
import mailer from "../util/mailer";

const secretKey = "presspool-ai";
const generateToken = (payload: any) => {
    const token = sign(payload, secretKey, { expiresIn: '1d' });
    return token;
};

const authCheck: RequestHandler = async (req: Request, res: Response) => {
    log.info('auth check called');

    try {
        const tokenHeader = req.headers.authorization;
        const token = tokenHeader && tokenHeader.split(' ')[1];

        const result: JwtPayload = verify(token as string, secretKey) as JwtPayload;

        if (!result || !result.exp || !result.iat) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'JWT error' });
        }

        if (result.exp < result.iat) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'timeout error' });
        } else {
            const verifiedData = await db.query('select verified, email_verified from user_list where email = $1', [result.email]);
            if (verifiedData.rows.length <= 0) {
                return res.status(StatusCodes.NO_CONTENT).json({ records: [] });
            }

            useAirTable('Users', 'get', {
                'Email': result.email,
            })?.then(data => {
                return res.status(StatusCodes.OK).json({
                    ...data.data,
                    verified: verifiedData.rows[0].verified,
                    email_verified: verifiedData.rows[0].email_verified,
                    token,
                });
            }).catch(error => {
                console.log('err:', error.message);
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
            })
        }
    } catch (error: any) {
        log.error(`auth check fail: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
};

const signIn: RequestHandler = async (req: Request, res: Response) => {
    log.info("Sign in api called");
    const { email, password } = req.query;

    const verifiedData = await db.query('select verified, email_verified from user_list where email = $1', [email]);
    if (verifiedData.rows.length <= 0) {
        return res.status(StatusCodes.NO_CONTENT).json({ records: [] });
    }

    const token = generateToken({ email });
    useAirTable('Users', 'get', {
        'Email': email,
        'Password': password,
    })?.then(data => {
        return res.status(StatusCodes.OK).json({
            ...data.data,
            verified: verifiedData.rows[0].verified,
            email_verified: verifiedData.rows[0].email_verified,
            token
        });
    }).catch(error => {
        console.log('err:', error.message);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    });

};

const clientSignUp: RequestHandler = async (req: Request, res: Response) => {
    log.info('Sign up api called');

    const { fullName, email, password, company } = req.body;

    const isExist = await db.query('select * from user_list where email = $1', [email]);
    if (isExist.rows.length >= 1) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Same Email Exists!' });
    }

    const time = moment().valueOf();
    await db.query('insert into user_list (create_time, name, email, password, company, verified, user_type, email_verified) values ($1, $2, $3, $4, $5, $6, $7, $8)', [
        time,
        fullName,
        email,
        password,
        company,
        0,
        "client",
        0
    ]);

    useAirTable("Users", 'post', {
        'Full Name': fullName,
        'Email': email,
        'Password': password,
        'Company Name': company,
        'User Group': 'Client',
    })?.then(data => {
        // Send email to users
        mailer.sendWelcomeEmail(email, fullName, {
            type: 'sign-up',
            subject: 'Client Sign Up',
            token: generateToken({ email }),
        });

        return res.status(StatusCodes.OK).json({
            ...data.data,
            verified: 0,
            email_verified: 0,
            token: generateToken({ email }),
        });
    }).catch(error => {
        console.log('err:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    });
};

const verifyEmail: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        const result: JwtPayload = verify(token as string, secretKey) as JwtPayload;

        await db.query('update user_list set email_verified = 1 where email = $1', [result.email]);
        const verifiedData = await db.query('select verified from user_list where email = $1', [result.email]);
        if (verifiedData.rows.length <= 0) {
            return res.status(StatusCodes.NO_CONTENT).json({ records: [] });
        }

        useAirTable('Users', 'get', {
            'Email': result.email,
        })?.then(data => {
            return res.status(StatusCodes.OK).json({
                ...data.data,
                verified: verifiedData.rows[0].verified,
                email_verified: verifiedData.rows[0].email_verified,
                token,
            });
        }).catch(error => {
            console.log('err:', error.message);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
        });
    } catch (error: any) {
        log.error(`error while verifying email: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

const auth = {
    signIn,
    clientSignUp,
    check: authCheck,
    verifyEmail,
};

export default auth;
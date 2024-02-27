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
            const verifiedData = await db.query('select verified, email_verified, state, avatar from user_list where email = $1', [result.email]);
            if (verifiedData.rows.length <= 0 || verifiedData.rows[0].state === 'inactive') {
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
                    avatar: verifiedData.rows[0].avatar,
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

    const verifiedData = await db.query('select verified, email_verified, state from user_list where email = $1 and password = $2', [email, password]);
    if (verifiedData.rows.length <= 0 || verifiedData.rows[0].state === 'inactive') {
        return res.status(StatusCodes.NO_CONTENT).json({ records: [] });
    }

    const token = generateToken({ email });
    useAirTable('Users', 'get', {
        'Email': email,
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
    let { linkUrl } = req.body;

    const isExist = await db.query('select * from user_list where email = $1', [email]);
    if (isExist.rows.length >= 1) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Same Email Exists!' });
    }

    const time = moment().valueOf();
    const newUser = await db.query('insert into user_list (create_time, name, email, password, company, verified, user_type, email_verified) values ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [
        time,
        fullName,
        email,
        password,
        company,
        0,
        "client",
        0
    ]);

    linkUrl = `https://go.presspool.ai/${linkUrl}`;
    // assign to account manager if that's a affiliate link
    const adminUser = await db.query('SELECT id, assigned_users from admin_user WHERE link = $1', [linkUrl]);
    if (adminUser.rows.length > 0) {
        const value = adminUser.rows[0].assigned_users;
        const assignedUsers: Array<string> = value && value.length > 0 ? adminUser.rows[0].assigned_users.split(',') : [];
        assignedUsers.push(newUser.rows[0].id);
        await db.query('UPDATE admin_user SET assigned_users = $1 WHERE id = $2', [assignedUsers.join(','), adminUser.rows[0].id]);
    }

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

const creatorSignUp: RequestHandler = async (req: Request, res: Response) => {
    log.info('creator sign up called');

    try {
        const { fullName, email, password, newsletter } = req.body;

        const isExist = await db.query('SELECT * FROM creator_list WHERE email = $1', [email]);
        if (isExist.rows.length >= 1) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Same Email Exists!' });
        }

        const time = moment().valueOf();
        const newUser = await db.query('INSERT INTO creator_list (create_time, name, email, password, newsletter, verified, user_type, email_verified) values ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [
            time, fullName, email, password, newsletter, 0, 'creator', 0
        ]);

        return res.status(StatusCodes.OK).json({
            ...newUser.rows[0],
            token: generateToken({ email }),
        });
    } catch (error: any) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
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

const generateRandomNumbers = (count: number) => {
    const randomNumbers = [];
    for (let i = 0; i < count; i++) {
        const randomNumber = Math.floor(Math.random() * 10); // Adjust the range as needed
        randomNumbers.push(randomNumber);
    }

    return randomNumbers.join('');
};

const sendPasswordEmail: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        const isExist = await db.query('select * from user_list where email = $1', [email]);

        if (isExist.rows.length <= 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'The email does not exist. Please Sign Up first' });
        }

        const random = generateRandomNumbers(5);
        await db.query('UPDATE user_list set password_reset = $1 where email = $2', [random, email]);
        mailer.sendForgotPasswordEmail(email, random, isExist.rows[0].name);
        return res.status(StatusCodes.OK).json({ message: 'Password Reset email sent!' });
    } catch (error: any) {
        console.log('error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

const verifyPasswordEmail: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { email, code } = req.body;

        const isSame = await db.query('SELECT * from user_list where email = $1 and password_reset = $2 ', [email, code]);
        if (isSame.rows.length <= 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Code is not valid' });
        }
        return res.status(StatusCodes.OK).json('ok');
    } catch (error: any) {
        console.log('error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

const changePassword: RequestHandler = async (req: Request, res: Response) => {
    console.log('password reset called');
    try {
        const { email, password } = req.body;
        console.log('eee:', email, password);

        await db.query('UPDATE user_list set password = $1 where email = $2', [password, email]);

        return res.status(StatusCodes.OK).json('ok');
    } catch (error: any) {
        console.log('error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

const auth = {
    signIn,
    clientSignUp,
    check: authCheck,
    verifyEmail,
    sendPasswordEmail,
    verifyPasswordEmail,
    changePassword,

    creatorSignUp,
};

export default auth;
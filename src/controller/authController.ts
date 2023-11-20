import { RequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";

import moment from 'moment';
import db from "../util/db";
import useAirTable from "../util/useAirTable";
import log from "../util/logger";

const signIn: RequestHandler = async (req: Request, res: Response) => {
    log.info("Sign in api called");
    const { email, password } = req.query;

    const verifiedData = await db.query('select verified from user_list where email = $1', [email]);
    if (verifiedData.rows.length <= 0) {
        console.log('hereerer?');
        return res.status(StatusCodes.NO_CONTENT).json({ records: [] });
    }

    useAirTable('Users', 'get', {
        'Email': email,
        'Password': password,
    })?.then(data => {
        return res.status(StatusCodes.OK).json({
            ...data.data,
            verified: verifiedData.rows[0].verified
        });
    }).catch(error => {
        console.log('err:', error.message);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    })

};

const clientSignUp: RequestHandler = async (req: Request, res: Response) => {
    log.info('Sign up api called');

    const { fullName, email, password, company } = req.body;

    const time = moment().valueOf();
    await db.query('insert into user_list (create_time, name, email, password, company, verified, user_type) values ($1, $2, $3, $4, $5, $6, $7)', [
        time,
        fullName,
        email,
        password,
        company,
        0,
        "client"
    ]);

    useAirTable("Users", 'post', {
        'Full Name': fullName,
        'Email': email,
        'Password': password,
        'Company Name': company,
        'User Group': 'Client',
    })?.then(data => {
        return res.status(StatusCodes.OK).json({
            ...data.data,
            verified: 0,
        });
    }).catch(error => {
        console.log('err:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    });
};

const auth = {
    signIn,
    clientSignUp,
};

export default auth;
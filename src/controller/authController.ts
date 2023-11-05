import { RequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";
import axios from 'axios';

import useAirTable from "../util/useAirTable";
import log from "../util/logger";

const signIn: RequestHandler = async (req: Request, res: Response) => {
    log.info("Sign in api called");
    const { email, password } = req.query;

    console.log('d:', email, password);
    useAirTable('Users', 'get', {
        'Email': email,
        'Password': password,
    })?.then(data => {
        console.log('dat:', data.data);
        return res.status(StatusCodes.OK).json(data.data);
    }).catch(error => {
        console.log('err:', error.message);
        return res.status(StatusCodes.OK).json({ message: error.message });
    })

};

const clientSignUp: RequestHandler = async (req: Request, res: Response) => {
    log.info('Sign up api called');

    const { fullName, email, password, company } = req.body;

    useAirTable("Users", 'post', {
        'Full Name': fullName,
        'Email': email,
        'Password': password,
        'Company Name': company,
        'User Group': 'Client',
    })?.then(data => {
        console.log('dat:', data);
        return res.status(StatusCodes.OK).json(data.data);
    }).catch(error => {
        console.log('err:', error.message);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    });
};

const auth = {
    signIn,
    clientSignUp,
};

export default auth;
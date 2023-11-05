import { RequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";
import axios from 'axios';

import log from "../util/logger";

const signIn: RequestHandler = async (req: Request, res: Response) => {
    log.info("Sign in api called");

    return res.status(StatusCodes.OK).json("auth");
};

const clientSignUp: RequestHandler = async (req: Request, res: Response) => {
    log.info('Sign up api called');

    return res.status(StatusCodes.OK).json();
};

const auth = {
    signIn,
    clientSignUp,
};

export default auth;
import { RequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";

import useAirTable from "../util/useAirTable";
import log from '../util/logger';

const getNewsletter: RequestHandler = async (_req: Request, res: Response) => {
    log.info('get newsletter called');

    useAirTable('Newsletters', 'get')?.then(data => {
        console.log('data:', data.data);
        return res.status(StatusCodes.OK).json(data.data);
    }).catch(error => {
        console.log('err:', error.message);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    })
};

const data = {
    getNewsletter,
};

export default data;
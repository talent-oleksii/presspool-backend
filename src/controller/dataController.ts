import { RequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";

import useAirTable from "../util/useAirTable";
import log from '../util/logger';

const getNewsletter: RequestHandler = async (_req: Request, res: Response) => {
    log.info('get newsletter called');

    useAirTable('Newsletters', 'get')?.then(data => {
        return res.status(StatusCodes.OK).json(data.data);
    }).catch(error => {
        console.log('err:', error.message);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    });
};

const getPricing: RequestHandler = async (_req: Request, res: Response) => {
    log.info('get pricing called');
    useAirTable('Pricing', 'get')?.then(data => {
        return res.status(StatusCodes.OK).json(data.data);
    }).catch(error => {
        log.error('get pricig error:', error.message);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    });
};

const addCampaign: RequestHandler = async (req: Request, res: Response) => {
    log.info('add campaign called');
    console.log('body:', req.body);
    useAirTable('Users', 'post', )?.then(data => {});
};

const data = {
    getNewsletter,
    getPricing,
    addCampaign,
};

export default data;
import { RequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";

import db from '../util/db';
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
    const result = await db.query('INSERT INTO campaign(email, name, url, demographic, newsletter, price) VALUES($1, $2, $3, $4, $5, $6) RETURNING *', [
        req.body.email,
        req.body.campaignName,
        req.body.url,
        req.body.currentTarget,
        req.body.currentAudience,
        req.body.currentPrice,
    ]);
    return res.status(200).json(result.rows[0]);
};

const data = {
    getNewsletter,
    getPricing,
    addCampaign,
};

export default data;
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
    try {
        const result = await db.query('INSERT INTO campaign(email, name, url, demographic, newsletter, price) VALUES($1, $2, $3, $4, $5, $6) RETURNING *', [
            req.body.email,
            req.body.campaignName,
            req.body.url,
            req.body.currentTarget,
            req.body.currentAudience,
            req.body.currentPrice,
        ]);
        return res.status(StatusCodes.OK).json(result.rows[0]);
    } catch (error: any) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const getCampaign: RequestHandler = async (req: Request, res: Response) => {
    log.info('get campaign called');

    try {
        const { email } = req.query;
        const result = await db.query('select id, name, url, demographic, newsletter, price from campaign where email = $1', [email]);
        return res.status(StatusCodes.OK).json(result.rows);
    } catch (error: any) {
        log.error(`get campaign error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const data = {
    getNewsletter,
    getPricing,
    addCampaign,
    getCampaign,
};

export default data;
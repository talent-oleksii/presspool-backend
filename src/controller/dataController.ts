import { RequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";
import axios from "axios";

import db from '../util/db';
import useAirTable from "../util/useAirTable";
import log from '../util/logger';

const showBaseList = async () => {
    const response = await axios.get('https://api.airtable.com/v0/meta/bases', {
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` }
    });

    console.log('base list:', response.data.bases);
};

const getNewsletter: RequestHandler = async (_req: Request, res: Response) => {
    log.info('get newsletter called');
    // showBaseList();

    useAirTable('Newsletters', 'get')?.then(data => {
        return res.status(StatusCodes.OK).json(data.data);
    }).catch(error => {
        console.log('err:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    });
};

const getAudience: RequestHandler = async (_req: Request, res: Response) => {
    log.info('get audience ');

    useAirTable('Audience', 'get')?.then(data => {
        return res.status(StatusCodes.OK).json(data.data);
    }).catch(error => {
        log.error(`get audience error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    })
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
        // update campaign ui id
        const result = await db.query('INSERT INTO campaign(email, name, url, demographic, newsletter, price) VALUES($1, $2, $3, $4, $5, $6) RETURNING *', [
            req.body.email,
            req.body.campaignName,
            req.body.url,
            req.body.currentTarget,
            req.body.currentAudience,
            req.body.currentPrice,
        ]);
        await db.query('update campaign_ui set campaign_id = $1 where id = $2', [result.rows[0].id, req.body.uiId]);
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

const addCampaignUI: RequestHandler = async (req: Request, res: Response) => {
    log.info('add campaign called');

    try {
        const { email, headLine, body, cta, image, pageUrl, noNeedCheck } = req.body;

        const result = await db.query('insert into campaign_ui (email, headline, body, cta, image, page_url, no_need_check) values ($1, $2, $3, $4, $5, $6, $7) returning *', [
            email,
            headLine,
            body,
            cta,
            image,
            pageUrl,
            noNeedCheck
        ]);

        return res.status(StatusCodes.OK).json(result.rows[0]);

    } catch (error: any) {
        log.error(`add campaign-ui error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
}

const data = {
    getNewsletter,
    getPricing,
    addCampaign,
    getCampaign,
    getAudience,
    addCampaignUI,
};

export default data;
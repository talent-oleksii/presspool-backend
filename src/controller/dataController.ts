import { RequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";
import axios from "axios";
import { v4 } from "uuid";

import db from '../util/db';
import useAirTable from "../util/useAirTable";
import log from '../util/logger';
import moment from "moment";
import mailer from "../util/mailer";

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
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
    });
};

const addAudience: RequestHandler = async (req: Request, res: Response) => {
    log.info('add audience');

    try {
        const { email, name } = req.body;
        const time = moment().valueOf();
        const result = await db.query('insert into audience (create_time, email, name) values ($1, $2, $3) returning *', [time, email, name]);

        return res.status(StatusCodes.OK).json(result.rows[0]);
    } catch (error) {
        log.error(`add audience error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
    }
};

const getAudience: RequestHandler = async (_req: Request, res: Response) => {
    log.info('get audience ');

    try {
        const result = await db.query('select * from audience order by create_time desc');
        return res.status(StatusCodes.OK).json(result.rows);
    } catch (error) {
        log.error(`get audience error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
    }
};

const getPricing: RequestHandler = async (_req: Request, res: Response) => {
    log.info('get pricing called');
    useAirTable('Pricing', 'get')?.then(data => {
        return res.status(StatusCodes.OK).json(data.data);
    }).catch(error => {
        log.error(`get pricig error:, ${error.message}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    });
};

const addCampaign: RequestHandler = async (req: Request, res: Response) => {
    log.info('add campaign called');
    try {
        const time = moment().valueOf();
        const uid = v4();
        // update campaign ui id
        const result = await db.query('INSERT INTO campaign(email, name, url, demographic, audience, price, create_time, uid, card_id, state) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *', [
            req.body.email,
            req.body.campaignName,
            req.body.url,
            req.body.currentTarget,
            `${JSON.stringify(req.body.currentAudience)}`,
            req.body.currentPrice,
            time,
            uid,
            req.body.currentCard,
            req.body.state,
        ]);

        // add on audience table
        const audience = req.body.currentAudience;
        for (const item of audience) {
            const count = await db.query('SELECT * FROM audience WHERE name = $1', [item]);

            if (count.rows.length <= 0) {
                try {
                    await db.query('INSERT INTO audience (name, email, create_time) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING', [item, req.body.email, time]);
                } catch (error) {
                    console.error('Error inserting into audience:', error);
                }
            }
        }
        await db.query('update campaign_ui set campaign_id = $1 where id = $2', [result.rows[0].id, req.body.uiId]);

        const retVal = await db.query('select *, campaign.id as id, campaign_ui.id as ui_id from campaign left join campaign_ui on campaign.id = campaign_ui.campaign_id where campaign.email = $1 and campaign.id = $2', [req.body.email, result.rows[0].id]);
        const data = retVal.rows[0];

        // sendWelcomeEmail(req.body.email, 'Campaign Successfully created');
        mailer.sendPublishEmail(req.body.email, req.body.campaignName);
        return res.status(StatusCodes.OK).json({ ...data, image: data.image ? data.image.toString('utf8') : null });
    } catch (error: any) {
        log.error(`error campaign: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const getCampaign: RequestHandler = async (req: Request, res: Response) => {
    log.info('get campaign called');

    try {
        const { email, searchStr, from, to } = req.query;
        console.log('from:', from, to);
        let result: any = undefined;

        let query = 'select *, campaign.id as id, campaign_ui.id as ui_id from campaign left join campaign_ui on campaign.id = campaign_ui.campaign_id where campaign.email = $1';
        let values = [email];
        if (searchStr) {
            query += ' and and name like $2';
            values = [...values, `%${searchStr}%`];

            if (from && to) {
                query += ' and campaign.create_time > $3 and campaign.create_time < $4';
                values = [...values, from, to];
            }
        } else {
            if (from && to) {
                query += ' and campaign.create_time > $2 and campaign.create_time < $3';
                values = [...values, from, to];
            }
        }

        log.info(`query: ${query}, values; ${values}`);
        result = await db.query(query, values);

        return res.status(StatusCodes.OK).json(result.rows.map((item: any) => ({ ...item, image: item.image ? item.image.toString('utf8') : null })));
    } catch (error: any) {
        log.error(`get campaign error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const getCampaignDetail: RequestHandler = async (req: Request, res: Response) => {
    log.info('get campaign detail called');
    try {
        const { id } = req.query;
        const campaignData = await db.query('select *, campaign.id as id from campaign left join campaign_ui on campaign.id = campaign_ui.campaign_id where campaign.id = $1', [id]);

        let row = campaignData.rows[0];
        row = {
            ...row,
            image: row.image ? row.image.toString('utf8') : null,
        };

        return res.status(StatusCodes.OK).json(row);
    } catch (error: any) {
        log.error(` get campaign detail error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const updateCampaignDetail: RequestHandler = async (req: Request, res: Response) => {
    log.info('update campaign detail called');
    try {
        const { id, email, campaignName, url, currentTarget, currentAudience, currentPrice, type, state, currentCard } = req.body;

        if (type === 'state') {
            await db.query('update campaign set state = $1 where id = $2', [state, id]);
            return res.status(StatusCodes.OK).json('successfully updated!');
        } else {
            const result = await db.query('update campaign set email = $1, name = $2, url = $3, demographic = $4, newsletter = $5, price = $6, card_id = $7 where id = $8 returning *', [
                email,
                campaignName,
                url,
                currentTarget,
                currentAudience,
                currentPrice,
                currentCard,
                id,
            ]);

            return res.status(StatusCodes.OK).json(result.rows[0]);
        }
    } catch (error: any) {
        log.error(` update campaign detail error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const addCampaignUI: RequestHandler = async (req: Request, res: Response) => {
    log.info('add campaign UI called');

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

        const data = result.rows[0];

        return res.status(StatusCodes.OK).json({
            ...data,
            image: image ? image.toString('utf-8') : null,
        });

    } catch (error: any) {
        log.error(`add campaign-ui error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
}

const updateCampaignUI: RequestHandler = async (req: Request, res: Response) => {
    log.info('update campaign called');

    try {
        const { id, headLine, body, cta, image, pageUrl, noNeedCheck } = req.body;
        const result = await db.query('update campaign_ui set headline = $1, body = $2, cta = $3, image = $4, page_url = $5, no_need_check = $6 where id = $7 returning *', [
            headLine,
            body,
            cta,
            image,
            pageUrl,
            noNeedCheck,
            id
        ]);

        const data = result.rows[0];

        return res.status(StatusCodes.OK).json({
            ...data,
            image: image ? image.toString('utf-8') : null,
        });
    } catch (error: any) {
        log.error(`add campaign-ui error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const getProfile: RequestHandler = async (req: Request, res: Response) => {
    log.info('get profile called');
    try {
        const { email } = req.query;
        const data = await db.query('select * from user_list where email = $1', [email]);

        const ret = data.rows[0];

        return res.status(StatusCodes.OK).json({ ...ret, avatar: ret.avatar ? ret.avatar.toString('utf8') : null });

    } catch (error: any) {
        log.error(`get profile error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const updateProfile: RequestHandler = async (req: Request, res: Response) => {
    log.info('update profile clicked');
    try {
        const { email, avatar } = req.body;
        console.log('ddd:', email, avatar);
        if (avatar) {
            await db.query('update user_list set avatar = $1 where email = $2', [avatar, email]);
        }

        return res.status(StatusCodes.OK).json('updated');

    } catch (error: any) {
        log.error(`update profile error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const clicked: RequestHandler = async (req: Request, res: Response) => {
    log.info('campaign clicked');
    try {
        console.log('ip:', req.body.ipAddress);
        const campaign = await db.query('select * from campaign where uid = $1', [req.body.id]);

        if (campaign.rows.length > 0) {
            const data = campaign.rows[0];
            const time = moment().valueOf();
            await db.query('insert into clicked_history (create_time, ip, campaign_id) values ($1, $2, $3)', [time, req.body.ipAddress, data.id]);
            const newPrice = Number(data.spent) + (data.demographic === 'consumer' ? 8 : 20);
            checkCampaignState(data.email, data.name, Number(data.price), Number(data.spent), data.demographic === 'consumer' ? 8 : 20);
            if (newPrice >= Number(data.price)) {
                mailer.sendBudgetIncreaseEmail(data.email, data.name);
                await db.query('update campaign set click_count = click_count + 1, spent = $1, state = "paused" where uid = $2', [0, req.body.id]);
            } else {
                await db.query('update campaign set click_count = click_count + 1, spent = $1 where uid = $2', [newPrice, req.body.id]);
            }
            return res.status(StatusCodes.OK).json(data);
        } else {
            return res.status(StatusCodes.BAD_GATEWAY).json('There is no campaign data');
        }
    } catch (error: any) {
        log.error(`clicked error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const checkCampaignState = (email: string, campaignName: string, totalPrice: number, spent: number, cpc: number) => {
    const value50 = totalPrice / 2;
    const value75 = totalPrice * 75 / 100;
    const value100 = totalPrice;

    // check if budget reached 50%
    if (value50 - cpc / 2 <= spent && spent <= value50 + cpc / 2) {
        mailer.sendBudgetReachEmail(email, campaignName, '50%');
    }
    if (value75 - cpc / 2 <= spent && spent <= value75 + cpc / 2) {
        mailer.sendBudgetReachEmail(email, campaignName, '75%');
    }
    if (value100 <= spent) {
        mailer.sendBudgetReachEmail(email, campaignName, '100%');
    }
};

const data = {
    getNewsletter,
    getPricing,
    addCampaign,
    getCampaign,
    getAudience,
    addAudience,
    addCampaignUI,
    getCampaignDetail,
    updateCampaignDetail,
    updateCampaignUI,

    clicked,

    getProfile,
    updateProfile
};

export default data;
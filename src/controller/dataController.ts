import { RequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";
import axios from "axios";
import CryptoJS from 'crypto-js';
import { JWT } from 'google-auth-library';

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

const getRegion: RequestHandler = async (_req: Request, res: Response) => {
    log.info('get region ');

    try {
        const result = await db.query('select * from region order by create_time desc');
        return res.status(StatusCodes.OK).json(result.rows);
    } catch (error) {
        log.error(`get region error: ${error}`);
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
        const uiData = (await db.query('SELECT * FROM campaign_ui WHERE id = $1', [req.body.uiId])).rows[0];
        const uid = encodeURIComponent(CryptoJS.AES.encrypt(uiData.page_url, process.env.PRESSPOOL_AES_KEY as string).toString());
        // Get if user payment verified or not
        // const verifiedData = await db.query('SELECT verified from user_list where email = $1', [req.body.email]);
        let campaignState = req.body.state;
        // if (Number(verifiedData.rows[0].verified) === 1) {
        //     campaignState = 'draft';
        // }

        // create google analytics stream for this campaign url
        // const jwt = new JWT({
        //     email: process.env.GOOGLE_ANALYTIC_CLIENT_EMAIL,
        //     key: process.env.GOOGLE_ANALYTIC_PRIVATE_KEY,
        //     scopes: ['https://www.googleapis.com/auth/analytics.edit']
        // });

        // const tokenResponse = await jwt.authorize();
        // const accessToken = tokenResponse.access_token;

        // const streamData = await axios.post(`https://analyticsadmin.googleapis.com/v1beta/properties/${process.env.GOOGLE_ANALYTIC_PROPERTY_ID}/dataStreams`, {
        //     name: '',
        //     type: 'WEB_DATA_STREAM',
        //     displayName: req.body.campaignName,
        //     webStreamData: {
        //         defaultUri: `https://track.presspool.ai/${uid}`,
        //     }
        // }, {
        //     headers: {
        //         Authorization: `Bearer ${accessToken}`,
        //         "Content-Type": 'application/json'
        //     }
        // });
        // const nameParts = streamData.data.name.split('/');

        // update campaign ui id
        const result = await db.query('INSERT INTO campaign(email, name, url, demographic, audience, price, create_time, uid, card_id, state, stream_id, region) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *', [
            req.body.email,
            req.body.campaignName,
            req.body.url,
            req.body.currentTarget,
            `${JSON.stringify(req.body.currentAudience)}`,
            req.body.currentPrice,
            time,
            uid,
            req.body.currentCard,
            campaignState,
            // nameParts[nameParts.length - 1],
            '',
            JSON.stringify(req.body.currentRegion),
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
        // add on region table
        const region = req.body.currentRegion;
        console.log('dd:', region);
        for (const item of region) {
            const count = await db.query('SELECT * FROM region WHERE name = $1', [item]);

            if (count.rows.length <= 0) {
                try {
                    await db.query('INSERT INTO region (name, email, create_time) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING', [item, req.body.email, time]);
                } catch (error) {
                    console.error('Error inserting into region:', error);
                }
            }
        }

        await db.query('update campaign_ui set campaign_id = $1 where id = $2 RETURNING *', [result.rows[0].id, req.body.uiId]);

        const retVal = await db.query('select *, campaign.id as id, campaign_ui.id as ui_id from campaign left join campaign_ui on campaign.id = campaign_ui.campaign_id where campaign.email = $1 and campaign.id = $2', [req.body.email, result.rows[0].id]);
        const data = retVal.rows[0];

        if (campaignState === 'active') {
            //send email to client
            const userData = (await db.query('SELECT * from user_list where email = $1', [req.body.email])).rows[0];
            await mailer.sendPublishEmail(req.body.email, userData.name, req.body.campaignName);
            // send email to super admins
            const admins = await db.query('SELECT email, name, role FROM admin_user');
            for (const admin of admins.rows) {
                if (admin.role === 'super_admin') {
                    await mailer.sendSuperAdminNotificationEmail(admin.email, admin.name,
                        req.body.campaignName,
                        userData.company,
                        userData.name,
                        req.body.currentPrice,
                        uid,
                        uiData.image,
                        uiData.additional_files.split(','),
                    );
                } else {
                    if (admin?.assigned_users?.includes(userData.id)) {
                        await mailer.sendAdminNotificationEmail(admin.email, admin.name,
                            req.body.campaignName,
                            userData.company,
                            userData.name,
                            req.body.currentPrice,
                            uid,
                        );
                    }
                }
            }
        }

        return res.status(StatusCodes.OK).json(data);
    } catch (error: any) {
        log.error(`error campaign: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const getCampaign: RequestHandler = async (req: Request, res: Response) => {
    log.info('get campaign called');

    try {
        const { email, searchStr, from, to } = req.query;
        let result: any = undefined;

        const ids: Array<Number> = [];
        const myCampaigns = await db.query('select id from campaign where email = $1', [email]);
        myCampaigns.rows.forEach(item => ids.push(Number(item.id)));
        // check if this email is manager or admin
        const teamList = await db.query('select owner, role, campaign_list from team_list where manager = $1', [email]);
        for (const item of teamList.rows) {
            if (item.role === 'admin') {
                const ownerCampaigns = await db.query('select id from campaign where email = $1', [item.owner]);
                ownerCampaigns.rows.forEach(item => ids.push(Number(item.id)));
            } else if (item.role === 'manager') {
                item.campaign_list.split(',').map((item: string) => ids.push(Number(item)));
            }
        }

        let query = 'SELECT *, campaign.id as id, campaign_ui.id as ui_id from campaign left join campaign_ui on campaign.id = campaign_ui.campaign_id where campaign.id = ANY($1)';
        let values: Array<any> = [ids];
        if (searchStr) {
            query += ' and name like $2';
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

        const clickedData = await db.query('SELECT create_time, id, campaign_id FROM clicked_history WHERE campaign_id = ANY($1)', [result.rows.map((item: any) => Number(item.id))]);

        return res.status(StatusCodes.OK).json({
            data: result.rows,
            clicked: clickedData.rows,
        });
    } catch (error: any) {
        log.error(`get campaign error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const getCampaignDetail: RequestHandler = async (req: Request, res: Response) => {
    log.info('get campaign detail called');
    try {
        const { id } = req.query;
        const campaignData = await db.query('select *, campaign.id as id, campaign_ui.id as ui_id from campaign left join campaign_ui on campaign.id = campaign_ui.campaign_id where campaign.id = $1', [id]);

        const row = campaignData.rows[0];

        return res.status(StatusCodes.OK).json(row);
    } catch (error: any) {
        log.error(` get campaign detail error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const updateCampaignDetail: RequestHandler = async (req: Request, res: Response) => {
    log.info('update campaign detail called');
    try {
        const { id, email, campaignName, url, currentTarget, currentAudience, currentRegion, currentPrice, type, state, currentCard } = req.body;

        // add on region table
        const time = moment().valueOf();
        const region = currentRegion;
        for (const item of region) {
            const count = await db.query('SELECT * FROM region WHERE name = $1', [item]);

            if (count.rows.length <= 0) {
                try {
                    await db.query('INSERT INTO region (name, email, create_time) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING', [item, email, time]);
                } catch (error) {
                    console.error('Error inserting into region:', error);
                }
            }
        }

        if (type === 'state') {
            const campaign = await db.query('select card_id from campaign where id = $1', [id]);
            const cardId = campaign.rows[0].card_id;
            if ((cardId === null || cardId.length <= 0) && state === 'active') return res.status(StatusCodes.BAD_GATEWAY).json({ message: 'You must set up billing method to activate that campaign' });
            const campaignData = await db.query('update campaign set state = $1 where id = $2 returning *', [state, id]);
            const uiData = (await db.query('SELECT * FROM campaign_ui WHERE campaign_id = $1', [id])).rows[0];

            if (state === 'active') {
                //send email to client
                const userData = (await db.query('SELECT * from user_list where email = $1', [email])).rows[0];
                await mailer.sendPublishEmail(email, userData.name, campaignName);
                // send email to super admins
                const admins = await db.query('SELECT email, name, role FROM admin_user');
                for (const admin of admins.rows) {
                    if (admin.role === 'super_admin') {
                        await mailer.sendSuperAdminNotificationEmail(admin.email, admin.name,
                            campaignName,
                            userData.company,
                            userData.name,
                            currentPrice,
                            campaignData.rows[0].uid,
                            uiData.image,
                            uiData.additional_files.split(','),
                        );
                    } else {
                        if (admin?.assigned_users?.includes(userData.id)) {
                            await mailer.sendAdminNotificationEmail(admin.email, admin.name,
                                campaignName,
                                userData.company,
                                userData.name,
                                currentPrice,
                                campaignData.rows[0].uid,
                            );
                        }
                    }
                }
            }
            return res.status(StatusCodes.OK).json('successfully updated!');
        } else if (type === 'budget') {
            const { newPrice } = req.body;
            await db.query('UPDATE campaign SET card_id = $1, price = $2 WHERE id = $3', [currentCard, newPrice, id]);
            return res.status(StatusCodes.OK).json('successfully updated!');
        } else {
            if (state) {
                const campaignData = await db.query('update campaign set email = $1, name = $2, url = $3, demographic = $4, newsletter = $5, price = $6, card_id = $7, state = $8, region = $9 where id = $10 returning *', [
                    email,
                    campaignName,
                    url,
                    currentTarget,
                    currentAudience,
                    currentPrice,
                    currentCard,
                    state,
                    JSON.stringify(currentRegion),
                    id,
                ]);
                if (state === 'active') {
                    //send email to client
                    const uiData = (await db.query('SELECT * FROM campaign_ui WHERE campaign_id = $1', [id])).rows[0];
                    const userData = (await db.query('SELECT * from user_list where email = $1', [email])).rows[0];
                    await mailer.sendPublishEmail(email, userData.name, campaignName);
                    // send email to super admins
                    const admins = await db.query('SELECT email, name, role, assigned_users FROM admin_user');
                    for (const admin of admins.rows) {
                        if (admin.role === 'super_admin') {
                            await mailer.sendSuperAdminNotificationEmail(admin.email, admin.name,
                                campaignName,
                                userData.company,
                                userData.name,
                                currentPrice,
                                campaignData.rows[0].uid,
                                uiData.image,
                                uiData.additional_files.split(','),
                            );
                        } else {
                            if (admin?.assigned_users?.includes(userData.id)) {
                                await mailer.sendAdminNotificationEmail(admin.email, admin.name,
                                    campaignName,
                                    userData.company,
                                    userData.name,
                                    currentPrice,
                                    campaignData.rows[0].uid,
                                );
                            }
                        }
                    }
                }
            } else {
                await db.query('update campaign set email = $1, name = $2, url = $3, demographic = $4, newsletter = $5, price = $6, card_id = $7, region = $8 where id = $9', [
                    email,
                    campaignName,
                    url,
                    currentTarget,
                    currentAudience,
                    currentPrice,
                    currentCard,
                    JSON.stringify(currentRegion),
                    id,
                ]);
            }

            const campaignData = await db.query('select *, campaign.id as id, campaign_ui.id as ui_id from campaign left join campaign_ui on campaign.id = campaign_ui.campaign_id where campaign.id = $1', [id]);

            const row = campaignData.rows[0];

            return res.status(StatusCodes.OK).json(row);
        }
    } catch (error: any) {
        log.error(` update campaign detail error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

const addCampaignUI: RequestHandler = async (req: Request, res: Response) => {
    log.info('add campaign UI called');

    try {
        if (!req.files || !(req.files as any)['image']) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'No image provided!' });
        const image = (req.files as any)['image'][0].location;
        let additionalFiles = (req.files as any)['additional_file'];
        const { email, headLine, body, cta, pageUrl, noNeedCheck } = req.body;
        additionalFiles = additionalFiles ? additionalFiles.map((item: any) => item.location).join(',') : '';

        const result = await db.query('insert into campaign_ui (email, headline, body, cta, image, page_url, no_need_check, additional_files) values ($1, $2, $3, $4, $5, $6, $7, $8) returning *', [
            email,
            headLine,
            body,
            cta,
            image,
            pageUrl,
            noNeedCheck,
            additionalFiles
        ]);

        const data = result.rows[0];

        return res.status(StatusCodes.OK).json(data);

    } catch (error: any) {
        log.error(`add campaign-ui error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
}

const updateCampaignUI: RequestHandler = async (req: Request, res: Response) => {
    log.info('update campaign called');

    try {
        const image = (req.files as any)['image'] ? (req.files as any)['image'][0].location : '';
        const { id, headLine, body, cta, pageUrl, noNeedCheck } = req.body;
        let additionalFiles = (req.files as any)['additional_file'];
        additionalFiles = additionalFiles ? additionalFiles.map((item: any) => item.location).join(',') : '';
        let result: any = undefined;
        if (image.length > 2) {
            result = await db.query('update campaign_ui set headline = $1, body = $2, cta = $3, page_url = $4, image = $5, additional_files = $6 where id = $7 returning *', [
                headLine,
                body,
                cta,
                pageUrl,
                image,
                additionalFiles,
                id
            ]);
        } else {
            result = await db.query('update campaign_ui set headline = $1, body = $2, cta = $3, page_url = $4, additional_files = $5 where id = $6 returning *', [
                headLine,
                body,
                cta,
                pageUrl,
                additionalFiles,
                id
            ]);
        }

        const data = result.rows[0];

        return res.status(StatusCodes.OK).json(data);
    } catch (error: any) {
        log.error(`update campaign-ui error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const getProfile: RequestHandler = async (req: Request, res: Response) => {
    log.info('get profile called');
    try {
        const { email } = req.query;
        const data = await db.query('select * from user_list where email = $1', [email]);
        const teamData = await db.query('SELECT team_list.*, user_list.name, user_list.avatar FROM team_list LEFT JOIN user_list ON team_list.manager = user_list.email  WHERE owner = $1', [email]);

        const ret = data.rows[0];

        return res.status(StatusCodes.OK).json({
            profile: ret,
            teamData: teamData.rows
        });

    } catch (error: any) {
        log.error(`get profile error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const updateProfile: RequestHandler = async (req: Request, res: Response) => {
    log.info('update profile clicked');
    try {
        if (!req.files || !(req.files as any)['avatar']) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'No image provided!' });
        const avatar = (req.files as any)['avatar'][0].location;
        const { email } = req.body;
        if (avatar) {
            await db.query('update user_list set avatar = $1 where email = $2', [avatar, email]);
        }

        return res.status(StatusCodes.OK).json({ avatar });

    } catch (error: any) {
        log.error(`update profile error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
    }
};

const getCPC = (budget: number) => {
    const beehiivBudget = Math.round((budget / ((4 * (1 + 0.10)) / (1 - 0.60))) * 4) - 2;
    return budget / (beehiivBudget / 4);
};

const clicked: RequestHandler = async (req: Request, res: Response) => {
    log.info('campaign clicked');
    try {
        const campaign = await db.query('select campaign.id, page_url as url, state, campaign.email, name, price, spent, demographic from campaign left join campaign_ui on campaign.id = campaign_ui.campaign_id where uid = $1', [req.body.id]);

        if (campaign.rows.length > 0) {
            const data = campaign.rows[0];
            if (data.state !== 'active') {
                return res.status(StatusCodes.BAD_REQUEST).send('campaign not activated');
            }
            const time = moment().valueOf();

            let addUnique: number = 0;
            const isUnique = await db.query('SELECT * from clicked_history where ip = $1 and campaign_id = $2', [req.body.ipAddress, data.id]);
            if (isUnique.rows.length <= 0) addUnique = 1;

            await db.query('insert into clicked_history (create_time, ip, campaign_id) values ($1, $2, $3)', [time, req.body.ipAddress, data.id]);
            const user = await db.query('select name from user_list where email = $1', [data.email]);
            let newPrice = Number(data.spent);
            if (isUnique.rows.length <= 0) newPrice = Number(data.spent) + getCPC(data.price);
            checkCampaignState(data.email, data.name, Number(data.price), Number(data.spent), getCPC(data.price), user.rows[0].name);
            if (newPrice >= Number(data.price)) {
                mailer.sendBudgetIncreaseEmail(data.email, data.name, data.price, user.rows[0].name);
                await db.query('update campaign set click_count = click_count + 1, unique_clicks = unique_clicks + $1, state = $2 where uid = $3', [addUnique, 'paused', req.body.id]);
            } else {
                await db.query('update campaign set click_count = click_count + 1, unique_clicks = unique_clicks + $1, spent = $2 where uid = $3', [addUnique, newPrice, req.body.id]);
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

const checkCampaignState = (email: string, campaignName: string, totalPrice: number, spent: number, cpc: number, userName: string) => {
    // const value50 = totalPrice / 2;
    const value80 = totalPrice * 80 / 100;
    // const value100 = totalPrice;

    // check if budget reached 50%
    if (value80 - cpc / 2 <= spent && spent <= value80 + cpc / 2) {
        mailer.sendBudgetReachEmail(email, campaignName, '80', userName);
    }
    // if (value75 - cpc / 2 <= spent && spent <= value75 + cpc / 2) {
    //     mailer.sendBudgetReachEmail(email, campaignName, '75%', userName);
    // }
    // if (value100 <= spent) {
    //     mailer.sendBudgetReachEmail(email, campaignName, '100%', userName);
    // }
};

const getUnbilled: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { email } = req.query;
        const campaigns = await db.query('SELECT spent, billed from campaign where email = $1', [email]);

        let unbilled = 0;
        campaigns.rows.forEach(item => {
            unbilled += Number(item.spent) - Number(item.billed);
        });

        return res.status(StatusCodes.OK).json({ unbilled });
    } catch (error: any) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

const addTeamMeber: RequestHandler = async (req: Request, res: Response) => {
    console.log('add member called');
    try {
        const { owner, email, type, campaignIds } = req.body;

        const ownerInfo = await db.query('select * from user_list where email = $1', [owner]);
        // if (isExist.rows.length <= 0) {
        //     return res.status(StatusCodes.BAD_REQUEST).json({ message: 'User email does not exist!' });
        // }

        const isMember = await db.query('SELECT * from team_list WHERE owner = $1 and manager = $2', [owner, email]);
        if (isMember.rows.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Email already exists in the team list' });
        }

        // Send email
        await mailer.sendAddTemmateEmail(ownerInfo.rows[0].name, ownerInfo.rows[0].company, email);

        const time = moment().valueOf().toString();
        await db.query('INSERT INTO team_list (owner, manager, role, campaign_list, create_time) VALUES ($1, $2, $3, $4, $5)',
            [owner, email, type, campaignIds.join(','), time]);

        return res.status(StatusCodes.OK).json({ message: 'Successfully Added!' });

    } catch (error: any) {
        console.log('error on add member:', error.message);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

const updateTeamMember: RequestHandler = async (req: Request, res: Response) => {
    console.log('update team member called');
    try {
        const { teamData, owner } = req.body;

        await db.query('DELETE from team_list where owner = $1', [owner]);

        const time = moment().valueOf();
        for (const team of teamData) {
            await db.query('INSERT INTO team_list (owner, manager, role, campaign_list, create_time) values ($1, $2, $3, $4, $5)',
                [team.owner, team.manager, team.role, team.campaign_list, time]);
        }

        return res.status(StatusCodes.OK).json({ message: 'Successfully updated!' });
    } catch (error: any) {
        console.log('update team member erorr:', error.message);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

const getGuide: RequestHandler = async (_req: Request, res: Response) => {
    console.log('get guide called');
    try {
        const data = await db.query('SELECT * FROM guide');

        return res.status(StatusCodes.OK).json(data.rows);
    } catch (error: any) {
        console.log('get guide error:', error.message);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

const data = {
    getNewsletter,
    getPricing,
    addCampaign,
    getCampaign,
    getRegion,
    getAudience,
    addAudience,
    addCampaignUI,
    getCampaignDetail,
    updateCampaignDetail,
    updateCampaignUI,
    getUnbilled,

    clicked,

    getProfile,
    updateProfile,
    addTeamMeber,
    updateTeamMember,

    getGuide,
};

export default data;
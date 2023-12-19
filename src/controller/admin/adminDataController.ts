import { RequestHandler, Request, Response } from 'express';

import db from '../../util/db';
import { StatusCodes } from 'http-status-codes';

const getDashboardOverviewData: RequestHandler = async (req: Request, res: Response) => {
  console.log('get dashboard overview data called');
  try {
    const clientCount = await db.query('SELECT count(*) as total_count, count(*) FILTER (where email_verified = $1) as inactive_count from user_list', [0]);
    const campaignCount = await db.query('SELECT count(*) FILTER (WHERE state = $1) as active_count, count(*) FILTER (WHERE state = $2) as draft_count, SUM(price) as total_revenue, SUM(spent) as total_spent, SUM(billed) as total_profit from campaign', ['active', 'draft']);

    const clickedData = await db.query('SELECT create_time, id, campaign_id FROM clicked_history');

    return res.status(StatusCodes.OK).json({
      totalClient: clientCount.rows[0].total_count,
      inactiveClient: clientCount.rows[0].inactive_count,
      activeCampaign: campaignCount.rows[0].active_count,
      draftCampaign: campaignCount.rows[0].draft_count,
      totalRevenue: campaignCount.rows[0].total_revenue,
      totalSpent: campaignCount.rows[0].total_spent,
      totalProfit: campaignCount.rows[0].total_profit,
      unpaid: campaignCount.rows[0].total_spent - campaignCount.rows[0].total_profit,
      clicked: clickedData.rows,
    });
  } catch (error: any) {
    console.log('get dashboard overview error:', error.message);
    return res.status(StatusCodes.OK).json({ message: error.message });
  }
};

const getDashboardCampaignList: RequestHandler = async (req: Request, res: Response) => {
  console.log('get capaign list called');
  try {
    const { searchStr } = req.query;
    const campaign = await db.query('SELECT id, name from campaign where name like $1', [`%${searchStr}%`]);

    return res.status(StatusCodes.OK).json(campaign.rows);
  } catch (error: any) {
    console.log('get dashboard campaign list error:', error.message);
    return res.status(StatusCodes.OK).json({ message: error.message });
  }
};

const getDashboardCampaignDetail: RequestHandler = async (req: Request, res: Response) => {
  console.log('get dashboard campaign detail called');
  try {
    const { id } = req.query;

    // const totalClick = await db.query('select count(*) from clicked_history where campaign_id = $1', [id]);
    const clicks = await db.query('select * from clicked_history where campaign_id = $1', [id]);
    const campaignData = await db.query('select *, campaign.id as id from campaign left join campaign_ui on campaign.id = campaign_ui.campaign_id where campaign.id = $1', [id]);

    return res.status(StatusCodes.OK).json({
      ...campaignData.rows[0],
      // totalClick: totalClick.rows[0].count,
      clicked: clicks.rows,
    });

  } catch (error: any) {
    console.log('get dashboard campaign detail error:', error.message);
    return res.status(StatusCodes.OK).json({ message: error.message });
  }
};

const adminData = {
  getDashboardOverviewData,
  getDashboardCampaignList,
  getDashboardCampaignDetail,
};

export default adminData;
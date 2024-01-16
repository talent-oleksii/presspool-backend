import { RequestHandler, Request, Response } from 'express';

import db from '../../util/db';
import { StatusCodes } from 'http-status-codes';

const getDashboardOverviewData: RequestHandler = async (req: Request, res: Response) => {
  console.log('get dashboard overview data called');
  try {
    console.log('req.headers.role:', req.headers.role);
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
    const campaignData = await db.query('select *, campaign.id as id, campaign_ui.id as ui_id from campaign left join campaign_ui on campaign.id = campaign_ui.campaign_id where campaign.id = $1', [id]);

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

const getDashboardClient: RequestHandler = async (req: Request, res: Response) => {
  console.log('get dashboard client called');
  try {
    const { searchStr } = req.query;
    const users = await db.query('select user_list.email, user_list.state, user_list.id, COALESCE(SUM(spent), 0) as spent, user_list.create_time, count(campaign.id) as campaign_count, user_list.name, user_list.email, user_list.avatar from user_list left join campaign on user_list.email = campaign.email where user_list.name like $1 group by user_list.id', [`%${searchStr}%`]);

    return res.status(StatusCodes.OK).json(users.rows);
  } catch (error: any) {
    console.log('get dashboard client error:', error);
    return res.status(StatusCodes.OK).json({ message: error.message });
  }
};

const updateDashboardClient: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id, data, type } = req.body;
    if (type === 'state') {
      await db.query('UPDATE user_list SET state = $1 where id = $2', [data, id]);
    }

    return res.status(StatusCodes.OK).json('updated');
  } catch (error: any) {
    console.log('update dashboard client error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const getClientDetail: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    const user = await db.query('select * from user_list where id = $1', [id]);
    if (user.rows.length <= 0) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'No user exists' });

    // get assign manager for this user
    const admins = await db.query("SELECT * from admin_user WHERE ',' || assigned_users || ',' LIKE $1", [`%,${id},%`]);
    console.log('adm:', admins.rows);

    const campaign = await db.query('select * from campaign where email = $1', [user.rows[0].email]);

    return res.status(StatusCodes.OK).json({
      userData: user.rows[0],
      campaignData: campaign.rows,
      assignedAdmins: admins.rows[0],
    });

  } catch (error: any) {
    console.log('get client detail error: ', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const updateClientDetail: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id, data } = req.body;
    console.log('id:', id, data);
  } catch (error: any) {
    console.log('update client detail error: ', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
}

const adminData = {
  getDashboardOverviewData,
  getDashboardCampaignList,
  getDashboardCampaignDetail,
  getDashboardClient,
  getClientDetail,
  updateClientDetail,
  updateDashboardClient,
};

export default adminData;
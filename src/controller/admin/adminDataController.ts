import { RequestHandler, Request, Response } from 'express';

import db from '../../util/db';
import { StatusCodes } from 'http-status-codes';

const getDashboardOverviewData: RequestHandler = async (_req: Request, res: Response) => {
  console.log('get dashboard overview data called');
  try {
    const clientCount = await db.query('SELECT count(*) as total_count, count(*) FILTER (where email_verified = $1) as inactive_count from user_list', [0]);
    const campaignCount = await db.query('SELECT count(*) FILTER (WHERE state = $1) as active_count, count(*) FILTER (WHERE state = $2) as draft_count, SUM(price) as total_revenue, SUM(spent) as total_spent, SUM(billed) as total_profit from campaign', ['active', 'draft']);

    return res.status(StatusCodes.OK).json({
      totalClient: clientCount.rows[0].total_count,
      inactiveClient: clientCount.rows[0].inactive_count,
      activeCampaign: campaignCount.rows[0].active_count,
      draftCampaign: campaignCount.rows[0].draft_count,
      totalRevenue: campaignCount.rows[0].total_revenue,
      totalSpent: campaignCount.rows[0].total_spent,
      totalProfit: campaignCount.rows[0].total_profit,
      unpaid: campaignCount.rows[0].total_spent - campaignCount.rows[0].total_profit,
    });
  } catch (error: any) {
    console.log('get dashboard overview error:', error.message);
    return res.status(StatusCodes.OK).json({ message: error.message });
  }
};

const adminData = {
  getDashboardOverviewData,
};

export default adminData;
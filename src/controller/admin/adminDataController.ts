import { RequestHandler, Request, Response } from "express";

import db from "../../util/db";
import { StatusCodes } from "http-status-codes";
import mailer from "../../util/mailer";
import moment from "moment";
import log from "../../util/logger";
import { calculateCampStats } from "../../util/common";

const getDashboardOverviewData: RequestHandler = async (
  req: Request,
  res: Response
) => {
  console.log("get dashboard overview data called");
  try {
    // if (req.headers.role === 'account_manager') { // is the account manager part, send only assigned data to dashboard
    //   const assignedUsers = (await db.query('SELECT assigned_users FROM admin_user WHERE id = $1', [req.headers.id])).rows[0].assigned_users;

    //   // WHERE id = ANY($1), [item.map(id)]
    //   const ids = assignedUsers.split(',').map((item: string) => Number(item));
    //   const clientCount = await db.query('SELECT count(*) as total_count, count(*) FILTER (where email_verified = $1) as inactive_count from user_list WHERE id = ANY($2)', [0, ids]);
    //   const campaignIds = (await db.query('SELECT campaign.id FROM campaign LEFT JOIN user_list ON campaign.email = user_list.email WHERE user_list.id = ANY($1) GROUP BY campaign.id', [ids])).rows;
    //   const camIds = campaignIds.map(item => Number(item.id));
    //   const campaignCount = await db.query('SELECT count(*) FILTER (WHERE state = $1) as active_count, count(*) FILTER (WHERE state = $2) as draft_count, SUM(price) as total_revenue, SUM(spent) as total_spent, SUM(billed) as total_profit from campaign WHERE campaign.id = ANY($3)', ['active', 'draft', camIds]);
    //   const clickedData = await db.query('SELECT create_time, id, campaign_id FROM clicked_history WHERE campaign_id = ANY($1)', [camIds]);

    //   return res.status(StatusCodes.OK).json({
    //     totalClient: clientCount.rows[0].total_count,
    //     inactiveClient: clientCount.rows[0].inactive_count,
    //     activeCampaign: campaignCount.rows[0].active_count,
    //     draftCampaign: campaignCount.rows[0].draft_count,
    //     totalRevenue: campaignCount.rows[0].total_revenue,
    //     totalSpent: campaignCount.rows[0].total_spent,
    //     totalProfit: campaignCount.rows[0].total_profit,
    //     unpaid: campaignCount.rows[0].total_spent - campaignCount.rows[0].total_profit,
    //     clicked: clickedData.rows,
    //   });
    // }

    const { accountManagerId, clientId, campaignId, from, to } = req.query;

    console.log("values:", accountManagerId, clientId, campaignId, from, to);
    const fromDateObject = moment.utc(from as string);
    const toDateObject = moment.utc(to as string);
    const formattedFromDate = fromDateObject.format("YYYY-MM-DD 00:00:00");
    const formattedToDate = toDateObject.format("YYYY-MM-DD 00:00:00");
    // const clientCount = await db.query('SELECT count(*) as total_count, count(*) FILTER (where email_verified = $1) as inactive_count from user_list', [0]);
    // const campaignCount = await db.query('SELECT count(*) FILTER (WHERE state = $1) as active_count, count(*) FILTER (WHERE state = $2) as draft_count, SUM(price) as total_revenue, SUM(spent) as total_spent, SUM(billed) as total_profit from campaign', ['active', 'draft']);

    // const clickedData = await db.query('SELECT create_time, id, campaign_id FROM clicked_history');

    // return res.status(StatusCodes.OK).json({
    //   totalClient: clientCount.rows[0].total_count,
    //   inactiveClient: clientCount.rows[0].inactive_count,
    //   activeCampaign: campaignCount.rows[0].active_count,
    //   draftCampaign: campaignCount.rows[0].draft_count,
    //   totalRevenue: campaignCount.rows[0].total_revenue,
    //   totalSpent: campaignCount.rows[0].total_spent,
    //   totalProfit: campaignCount.rows[0].total_profit,
    //   unpaid: campaignCount.rows[0].total_spent - campaignCount.rows[0].total_profit,
    //   clicked: clickedData.rows,
    // });

    let campaignData = [];
    let clickedHistoryQuery = "";
    let values: any[] = [];
    let prevQueryValues: any[] = [];
    if (Number(campaignId) !== 0) {
      clickedHistoryQuery +=
        "SELECT * from clicked_history WHERE campaign_id = $1";
      values = [campaignId];
      prevQueryValues = [campaignId];
      campaignData = (
        await db.query("SELECT * from campaign WHERE id = $1", [campaignId])
      ).rows;
    } else if (Number(clientId) !== 0) {
      const client = await db.query(
        "SELECT email FROM user_list WHERE id = $1",
        [clientId]
      );
      const email = client.rows[0].email;
      campaignData = (
        await db.query("SELECT * FROM campaign WHERE email = $1", [email])
      ).rows;
      console.log(
        "email:",
        email,
        campaignData,
        campaignData.map((item) => item.id)
      );
      clickedHistoryQuery +=
        "SELECT * FROM clicked_history WHERE campaign_id = ANY($1)";
      values = [campaignData.map((item) => Number(item.id))];
      prevQueryValues = [campaignData.map((item) => Number(item.id))];
    } else if (Number(accountManagerId) !== 0) {
      const assinged = (
        await db.query("SELECT assigned_users FROM admin_user WHERE id = $1", [
          accountManagerId,
        ])
      ).rows;
      if (!assinged[0].assigned_users) {
        campaignData = [];
      } else {
        const clients = (
          await db.query("SELECT email FROM user_list WHERE id = ANY($1)", [
            assinged[0].assigned_users
              .split(",")
              .map((item: any) => Number(item)),
          ])
        ).rows;
        campaignData = (
          await db.query("SELECT * FROM campaign WHERE email = ANY($1)", [
            clients.map((item) => item.email),
          ])
        ).rows;
        clickedHistoryQuery +=
          "SELECT * FROM clicked_history WHERE campaign_id = ANY($1)";
        values = [campaignData.map((item) => Number(item.id))];
        prevQueryValues = [campaignData.map((item) => Number(item.id))];
      }
    } else {
      campaignData = (await db.query("SELECT * from campaign")).rows;
      clickedHistoryQuery +=
        "SELECT * from clicked_history WHERE campaign_id is not null";
    }

    if (from && to && clickedHistoryQuery) {
      const startDate = moment(formattedFromDate);
      const endDate = moment(formattedToDate);
      const differenceInDays = endDate.diff(startDate, "days");
      const prevDate = startDate
        .clone()
        .subtract(differenceInDays, "day")
        .format("YYYY-MM-DD 00:00:00");
      console.log(`Difference in days: ${differenceInDays}`);
      console.log(`Prev: ${prevDate}`);

      clickedHistoryQuery += ` and TO_TIMESTAMP(CAST(create_time AS bigint)/1000) BETWEEN ${
        values.length ? `$2 and $3` : `$1 and $2`
      }`;
      values = [...values, formattedFromDate, formattedToDate];
      prevQueryValues = [...prevQueryValues, prevDate, formattedFromDate];
    }

    return res.status(StatusCodes.OK).json({
      clicked: clickedHistoryQuery
        ? (await db.query(clickedHistoryQuery, values)).rows
        : [],
      campaign: campaignData,
      prevData: calculateCampStats(
        campaignData,
        clickedHistoryQuery
          ? (await db.query(clickedHistoryQuery, prevQueryValues)).rows
          : []
      ),
    });
  } catch (error: any) {
    console.log("get dashboard overview error:", error.message);
    return res.status(StatusCodes.OK).json({ message: error.message });
  }
};

const getNewsletter: RequestHandler = async (req: Request, res: Response) => {
  log.info("get newsletter called");
  // showBaseList();

  try {
    const { campaignId, from, to } = req.query;
    const fromDateObject = moment.utc(from as string);
    const toDateObject = moment.utc(to as string);
    const formattedFromDate = fromDateObject.format("YYYY-MM-DD 00:00:00");
    const formattedToDate = toDateObject.format("YYYY-MM-DD 00:00:00");
    let params = [campaignId];
    let query = `SELECT ch.newsletter_id name,camp.id, SUM(ch.count) AS total_clicks, SUM(ch.unique_click) unique_clicks, SUM(CASE WHEN (ch.user_medium = 'newsletter' OR ch.user_medium = 'referral') AND ch.duration > ch.count * 1.5 AND ch.duration > 0  THEN ch.unique_click ELSE 0 END) verified_clicks FROM public.clicked_history ch
    INNER JOIN public.campaign camp on ch.campaign_id = camp.id
    WHERE camp.id = $1`;

    if (from && to) {
      query +=
        " and TO_TIMESTAMP(CAST(ch.create_time AS bigint)/1000) BETWEEN $2 and $3";
      params = [...params, formattedFromDate, formattedToDate];
    }

    query += " GROUP BY ch.newsletter_id, camp.id";
    const newsletter = await db.query(query, params);
    return res.status(StatusCodes.OK).json(newsletter.rows);
  } catch (error: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
  }
};

const getDashboardCampaignList: RequestHandler = async (
  req: Request,
  res: Response
) => {
  console.log("get capaign list called");
  try {
    const { searchStr } = req.query;

    if (req.headers.role === "account_manager") {
      const assignedUsers = (
        await db.query("SELECT assigned_users FROM admin_user WHERE id = $1", [
          req.headers.id,
        ])
      ).rows[0].assigned_users;
      const ids = assignedUsers.split(",").map((item: string) => Number(item));
      const campaignIds = (
        await db.query(
          "SELECT campaign.id FROM campaign LEFT JOIN user_list ON campaign.email = user_list.email WHERE user_list.id = ANY($1) GROUP BY campaign.id",
          [ids]
        )
      ).rows;
      const camIds = campaignIds.map((item) => Number(item.id));
      const campaign = await db.query(
        "SELECT id, name from campaign where name like $1 AND id = ANY($2)",
        [`%${searchStr}%`, camIds]
      );
      return res.status(StatusCodes.OK).json(campaign.rows);
    }
    const campaign = await db.query(
      "SELECT id, name from campaign where name like $1",
      [`%${searchStr}%`]
    );

    return res.status(StatusCodes.OK).json(campaign.rows);
  } catch (error: any) {
    console.log("get dashboard campaign list error:", error.message);
    return res.status(StatusCodes.OK).json({ message: error.message });
  }
};

const getDashboardCampaignDetail: RequestHandler = async (
  req: Request,
  res: Response
) => {
  console.log("get dashboard campaign detail called");
  try {
    const { id } = req.query;

    // const totalClick = await db.query('select count(*) from clicked_history where campaign_id = $1', [id]);
    const clicks = await db.query(
      "select * from clicked_history where campaign_id = $1",
      [id]
    );
    const campaignData = await db.query(
      "select *, campaign.id as id, campaign_ui.id as ui_id from campaign left join campaign_ui on campaign.id = campaign_ui.campaign_id where campaign.id = $1",
      [id]
    );

    return res.status(StatusCodes.OK).json({
      ...campaignData.rows[0],
      // totalClick: totalClick.rows[0].count,
      clicked: clicks.rows,
    });
  } catch (error: any) {
    console.log("get dashboard campaign detail error:", error.message);
    return res.status(StatusCodes.OK).json({ message: error.message });
  }
};

const getDashboardClient: RequestHandler = async (
  req: Request,
  res: Response
) => {
  console.log("get dashboard client called");
  try {
    const { searchStr } = req.query;
    if (req.headers.role === "account_manager") {
      const assignedUsers = (
        await db.query("SELECT assigned_users FROM admin_user WHERE id = $1", [
          req.headers.id,
        ])
      ).rows[0].assigned_users;
      const ids = assignedUsers
        ? assignedUsers.split(",").map((item: string) => Number(item))
        : [];
      const users = await db.query(
        `select user_list.email, user_list.company, user_list.state, user_list.id, COALESCE(SUM(spent), 0) as spent, COALESCE(SUM(billed), 0) as billed, user_list.create_time, count(campaign.id) as campaign_count, user_list.name, user_list.email, user_list.avatar, SUM(CASE WHEN campaign.state = 'active' THEN 1 ELSE 0 END) AS active_count,SUM(CASE WHEN campaign.state = 'completed' THEN 1 ELSE 0 END) AS completed_count,SUM(CASE WHEN campaign.state = 'draft' THEN 1 ELSE 0 END) AS draft_count,SUM(CASE WHEN campaign.state IN ('active', 'completed') THEN campaign.price ELSE 0 END) AS total_budget from user_list left join campaign on user_list.email = campaign.email where user_list.name like $1 and user_list.id = ANY($2) group by user_list.id`,
        [`%${searchStr}%`, ids]
      );

      return res.status(StatusCodes.OK).json(users.rows);
    }
    const users = await db.query(
      `select user_list.email, user_list.company, user_list.state, user_list.id, COALESCE(SUM(spent), 0) as spent, COALESCE(SUM(billed), 0) as billed, user_list.create_time, count(campaign.id) as campaign_count, user_list.name, user_list.email, user_list.avatar, SUM(CASE WHEN campaign.state = 'active' THEN 1 ELSE 0 END) AS active_count,SUM(CASE WHEN campaign.state = 'completed' THEN 1 ELSE 0 END) AS completed_count,SUM(CASE WHEN campaign.state = 'draft' THEN 1 ELSE 0 END) AS draft_count,SUM(CASE WHEN campaign.state IN ('active', 'completed') THEN campaign.price ELSE 0 END) AS total_budget from user_list left join campaign on user_list.email = campaign.email where user_list.name like $1 group by user_list.id`,
      [`%${searchStr}%`]
    );

    return res.status(StatusCodes.OK).json(users.rows);
  } catch (error: any) {
    console.log("get dashboard client error:", error);
    return res.status(StatusCodes.OK).json({ message: error.message });
  }
};

const updateDashboardClient: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { id, data, type } = req.body;
    if (type === "state") {
      await db.query("UPDATE user_list SET state = $1 where id = $2", [
        data,
        id,
      ]);
    }

    return res.status(StatusCodes.OK).json("updated");
  } catch (error: any) {
    console.log("update dashboard client error:", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const getClientDetail: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    const user = await db.query("select * from user_list where id = $1", [id]);
    if (user.rows.length <= 0)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "No user exists" });

    // get assign manager for this user
    const admins = await db.query(
      "SELECT * from admin_user WHERE ',' || assigned_users || ',' LIKE $1",
      [`%,${id},%`]
    );

    const campaign = await db.query(
      "select campaign.*, campaign_ui.additional_files from campaign LEFT JOIN campaign_ui ON campaign_ui.campaign_id = campaign.id where campaign.email = $1",
      [user.rows[0].email]
    );

    return res.status(StatusCodes.OK).json({
      userData: user.rows[0],
      campaignData: campaign.rows,
      assignedAdmins: admins.rows[0],
    });
  } catch (error: any) {
    console.log("get client detail error: ", error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const getClientCampaign: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { campaignId } = req.query;

    const data = await db.query(
      `
      SELECT campaign.name, campaign.click_count, campaign.unique_clicks, campaign.billed, campaign.email, campaign.state, user_list.company, user_list.name as user_name, user_list.avatar
      FROM campaign LEFT JOIN user_list ON campaign.email = user_list.email
      WHERE campaign.id = $1
    `,
      [campaignId]
    );

    return res.status(StatusCodes.OK).json(data.rows[0]);
  } catch (error: any) {
    console.log("get client campaign detail error:", error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const updateClientDetail: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { id, note } = req.body;
    await db.query("UPDATE user_list SET note = $1 where id = $2", [note, id]);
    return res.status(StatusCodes.OK).json("updated!");
  } catch (error: any) {
    console.log("update client detail error: ", error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const inviteClient: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { emails, link } = req.body;
    const emailList = emails.split(",");

    const adminUser = await db.query(
      "SELECT name from admin_user WHERE link = $1",
      [link]
    );

    for (const email of emailList) {
      await mailer.sendInviteEmail(adminUser.rows[0].name, email, link);
    }

    return res.status(StatusCodes.OK).json("sent!");
  } catch (error: any) {
    console.log("invite error:", error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const inviteAccountManager: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { emails } = req.body;
    await mailer.sendInviteAccountManagerEmail(emails);

    return res.status(StatusCodes.OK).json("sent!");
  } catch (error: any) {
    console.log("invite account manager error: ", error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const addGuide: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { title, description, type, fileType, link } = req.body;
    if (!req.files || !(req.files as any)["thumbnail"])
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "No image or file provided!" });
    const attach = (req.files as any)["attach"]
      ? (req.files as any)["attach"][0].location
      : link;
    const thumbnail = (req.files as any)["thumbnail"][0].location;
    const now = moment().valueOf().toString();

    const newData = await db.query(
      "INSERT INTO guide (create_time, title, description, type, attach, thumbnail, file_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [now, title, description, type, attach, thumbnail, fileType]
    );

    return res.status(StatusCodes.OK).json(newData.rows[0]);
  } catch (error: any) {
    console.log("add guide error:", error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const getGuide: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const data = await db.query("SELECT * FROM guide");

    return res.status(StatusCodes.OK).json(data.rows);
  } catch (error: any) {
    console.log("get guide error:", error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const deleteGuide: RequestHandler = async (req: Request, res: Response) => {
  console.log("delete guide clicked");
  try {
    const { id } = req.query;
    await db.query("DELETE FROM guide WHERE id = $1", [id]);

    return res.status(StatusCodes.OK).json("deleted!");
  } catch (error: any) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const getCampaignsByClient: RequestHandler = async (
  req: Request,
  res: Response
) => {
  console.log("get campaigns by client alled");
  try {
    const { client } = req.query;
    const campaigns = await db.query(
      "SELECT * FROM campaign WHERE email = $1",
      [client]
    );

    return res.status(StatusCodes.OK).json(campaigns.rows);
  } catch (error: any) {
    console.log("get campaign error:", error.message);

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const adminData = {
  getDashboardOverviewData,
  getDashboardCampaignList,
  getDashboardCampaignDetail,
  getDashboardClient,
  getClientDetail,
  getClientCampaign,
  updateClientDetail,
  updateDashboardClient,
  getCampaignsByClient,

  inviteClient,
  inviteAccountManager,

  addGuide,
  getGuide,
  deleteGuide,
  getNewsletter,
};

export default adminData;

import { RequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";

import db from "../../util/db";
import { calculateCampStats } from "../../util/common";
import log from "../../util/logger";
import moment from "moment";

const updateCreatorPreferences: RequestHandler = async (
  req: Request,
  res: Response
) => {
  console.log("creator login api called");
  try {
    const {
      audienceSize,
      audience,
      industry,
      position,
      geography,
      averageUniqueClick,
      cpc,
      creatorId,
      subscribers,
    } = req.body;
    const { rows } = await db.query(
      "update creator_list set audience_size = $2,audience= $3,industry= $4,position=$5,geography=$6,average_unique_click=$7,cpc=$8, email_verified= $9,total_subscribers=$10 where id = $1 RETURNING *",
      [
        creatorId,
        audienceSize,
        audience,
        JSON.stringify(industry),
        JSON.stringify(position),
        JSON.stringify(geography),
        averageUniqueClick,
        cpc,
        1,
        subscribers,
      ]
    );
    return res.status(StatusCodes.OK).json({
      ...rows[0],
    });
  } catch (error: any) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const updateAudienceSize: RequestHandler = async (
  req: Request,
  res: Response
) => {
  console.log("creator login api called");
  try {
    const { creatorId, subscribers } = req.body;
    const { rows } = await db.query(
      "update creator_list set total_subscribers = $2 where id = $1 RETURNING *",
      [creatorId, subscribers]
    );
    return res.status(StatusCodes.OK).json({
      ...rows[0],
    });
  } catch (error: any) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const updateAudience: RequestHandler = async (req: Request, res: Response) => {
  console.log("creator login api called");
  try {
    const { creatorId, audience } = req.body;
    const { rows } = await db.query(
      "update creator_list set audience = $2 where id = $1 RETURNING *",
      [creatorId, audience]
    );
    return res.status(StatusCodes.OK).json({
      ...rows[0],
    });
  } catch (error: any) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const updateTargeting: RequestHandler = async (req: Request, res: Response) => {
  try {
    const {
      industry,
      position,
      geography,
      averageUniqueClick,
      cpc,
      creatorId,
    } = req.body;
    const { rows } = await db.query(
      "update creator_list set industry= $2,position=$3,geography=$4,average_unique_click=$5,cpc=$6 where id = $1 RETURNING *",
      [
        creatorId,
        JSON.stringify(industry),
        JSON.stringify(position),
        JSON.stringify(geography),
        averageUniqueClick,
        cpc,
      ]
    );
    return res.status(StatusCodes.OK).json({
      ...rows[0],
    });
  } catch (error: any) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const updateSubscribeProof: RequestHandler = async (
  req: Request,
  res: Response
) => {
  console.log("creator login api called");
  try {
    const proof = (req.files as any)["subscriber_proof"]
      ? (req.files as any)["subscriber_proof"][0].location
      : null;
    const { creatorId } = req.body;
    const { rows } = await db.query(
      "update creator_list set proof_image = $2 where id = $1 RETURNING *",
      [creatorId, proof]
    );
    return res.status(StatusCodes.OK).json({
      ...rows[0],
    });
  } catch (error: any) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const getCampaign: RequestHandler = async (req: Request, res: Response) => {
  log.info("get campaign called");

  try {
    const { creatorId, searchStr, from, to, campaignIds } = req.query;
    const fromDateObject = moment.utc(from as string);
    const toDateObject = moment.utc(to as string);
    const formattedFromDate = fromDateObject.format("YYYY-MM-DD 00:00:00");
    const formattedToDate = toDateObject.format("YYYY-MM-DD 00:00:00");
    let result: any = undefined;
    let selectParams = [creatorId];
    let query = `SELECT *, campaign.id as id, campaign_ui.id as ui_id from campaign 
    left join campaign_ui on campaign.id = campaign_ui.campaign_id
    inner join campaign_creator on campaign.id = campaign_creator.campaign_id
    where campaign_creator.creator_id = $1`;

    if (campaignIds) {
      const parsedIds = (campaignIds as string[]).map((x) => Number(x));
      query += ` AND campaign.id IN(${parsedIds
        .map((id) => "'" + id + "'")
        .join(",")})`;
    }
    if (searchStr) {
      query += " and name like $2";
      selectParams = [...selectParams, `%${searchStr}%`];
    }
    result = await db.query(query, selectParams);

    let values = [creatorId, result.rows.map((item: any) => Number(item.id))];
    let prevValues = [
      creatorId,
      result.rows.map((item: any) => Number(item.id)),
    ];
    let clickedHistoryQuery = `SELECT ch.create_time, ch.id, ch.campaign_id, ch.count, ch.ip, ch.unique_click, ch.duration, ch.user_medium FROM clicked_history ch
      inner join creator_list cl on cl.newsletter = ch.newsletter_id
      WHERE cl.id = $1 and campaign_id = ANY($2)`;
    let prevRangeClickedHistoryQuery = null;
    if (from && to) {
      const startDate = moment(formattedFromDate);
      const endDate = moment(formattedToDate);
      const differenceInDays = endDate.diff(startDate, "days");
      const prevDate = startDate
        .clone()
        .subtract(differenceInDays, "day")
        .format("YYYY-MM-DD 00:00:00");
      console.log(`Difference in days: ${differenceInDays}`);
      console.log(`Prev: ${prevDate}`);

      clickedHistoryQuery +=
        " and TO_TIMESTAMP(CAST(create_time AS bigint)/1000) BETWEEN $3 and $4";
      values = [...values, formattedFromDate, formattedToDate];
      prevValues = [...prevValues, prevDate, formattedFromDate];
      prevRangeClickedHistoryQuery = `SELECT ch.create_time, ch.id, ch.campaign_id, ch.count, ch.ip, ch.unique_click, ch.duration, ch.user_medium FROM clicked_history ch
        inner join creator_list cl on cl.newsletter = ch.newsletter_id
        WHERE cl.id = $1 and campaign_id = ANY($2) and TO_TIMESTAMP(CAST(create_time AS bigint)/1000) BETWEEN $3 and $4`;
    }
    log.info(`query: ${clickedHistoryQuery}, values; ${values}`);
    const clickedData = await db.query(clickedHistoryQuery, values);
    const { rows: prevClickedData } = prevRangeClickedHistoryQuery
      ? await db.query(prevRangeClickedHistoryQuery, [...prevValues])
      : { rows: [] };
    const data = calculateCampStats(result.rows, prevClickedData);
    return res.status(StatusCodes.OK).json({
      data: result.rows,
      clicked: clickedData.rows,
      prevData: data,
    });
  } catch (error: any) {
    log.error(`get campaign error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
  }
};

const getNewsletter: RequestHandler = async (req: Request, res: Response) => {
  log.info("get newsletter called");
  // showBaseList();
  try {
    const { creatorId, from, to, campaignIds } = req.query;
    const fromDateObject = moment.utc(from as string);
    const toDateObject = moment.utc(to as string);
    const formattedFromDate = fromDateObject.format("YYYY-MM-DD 00:00:00");
    const formattedToDate = toDateObject.format("YYYY-MM-DD 00:00:00");
    let params = [creatorId];
    let query = `SELECT ch.newsletter_id name,camp.id, SUM(ch.count) AS total_clicks, SUM(ch.unique_click) unique_clicks, SUM(CASE WHEN (ch.user_medium = 'newsletter' OR ch.user_medium = 'referral') AND ch.duration > ch.count * 0.37 AND ch.duration > 0  THEN ch.unique_click ELSE 0 END) verified_clicks FROM public.clicked_history ch
    INNER JOIN public.campaign camp on ch.campaign_id = camp.id
    inner join campaign_creator on camp.id = campaign_creator.campaign_id
    inner join creator_list cl on cl.newsletter = ch.newsletter_id 
    where campaign_creator.creator_id = $1`;

    if (from && to) {
      query +=
        " and TO_TIMESTAMP(CAST(ch.create_time AS bigint)/1000) BETWEEN $2 and $3";
      params = [...params, formattedFromDate, formattedToDate];
    }

    if (campaignIds) {
      const parsedIds = (campaignIds as string[]).map((x) => Number(x));
      query += ` and ch.campaign_id IN(${parsedIds
        .map((id) => "'" + id + "'")
        .join(",")})`;
    }
    query += " GROUP BY ch.newsletter_id, camp.id";
    const newsletter = await db.query(query, params);
    return res.status(StatusCodes.OK).json(newsletter.rows);
  } catch (error: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
  }
};

const getCampaignList: RequestHandler = async (req: Request, res: Response) => {
  log.info("get campaign list called");
  try {
    const { creatorId } = req.query;
    const data = await db.query(
      `SELECT camp.id, name from campaign camp
      inner join campaign_creator on camp.id = campaign_creator.campaign_id
      WHERE campaign_creator.creator_id = $1`,
      [creatorId]
    );

    return res.status(StatusCodes.OK).json(data.rows);
  } catch (error: any) {
    console.log("error in getting campaign list:");
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const getReadyToPublish: RequestHandler = async (
  req: Request,
  res: Response
) => {
  log.info("get campaign list called");
  try {
    const { creatorId } = req.query;
    const data = await db.query(
      `SELECT creator_history.id as requestId, campaign.id as id, campaign_ui.id as ui_id, creator_list.cpc, creator_list.average_unique_click,campaign.uid,
      campaign.email, campaign.name,campaign_ui.headline,campaign_ui.body,campaign_ui.cta,campaign_ui.image,
      campaign_ui.page_url,campaign.demographic,campaign.audience,campaign.position,campaign.region,campaign_ui.conversion,
      campaign.create_time,
      campaign.start_date,
      campaign.complete_date,
	    creator_history.scheduled_date,
      campaign.state,
      campaign.url,
      user_list.company,
      user_list.team_avatar,
      SUM(clicked_history.count) AS total_clicks, 
      SUM(clicked_history.unique_click) unique_clicks, 
      SUM(CASE WHEN (clicked_history.user_medium = 'newsletter' OR clicked_history.user_medium = 'referral') AND clicked_history.duration > clicked_history.count * 0.37 AND clicked_history.duration > 0  THEN clicked_history.unique_click ELSE 0 END) verified_clicks
      from campaign 
      left join campaign_ui on campaign.id = campaign_ui.campaign_id
      left join clicked_history on clicked_history.campaign_id = campaign.id
      inner join campaign_creator on campaign.id = campaign_creator.campaign_id
      inner join creator_history on creator_history.campaign_id = campaign_creator.campaign_id and creator_history.creator_id = campaign_creator.creator_id
      inner join creator_list on creator_list.id = campaign_creator.creator_id
      inner join user_list on campaign.email = user_list.email
      where creator_list.id = $1 and campaign.complete_date is null and TO_TIMESTAMP(CAST(creator_history.scheduled_date AS bigint)) > CURRENT_TIMESTAMP and creator_history.state = 'ACCEPTED'
      group by campaign.id, campaign_ui.id, creator_list.cpc,creator_list.average_unique_click,user_list.company, user_list.team_avatar, creator_history.scheduled_date, creator_history.id`,
      [creatorId]
    );

    return res.status(StatusCodes.OK).json(data.rows);
  } catch (error: any) {
    console.log("error in getting campaign list:");
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const getNewRequests: RequestHandler = async (req: Request, res: Response) => {
  log.info("get campaign list called");
  try {
    const { creatorId } = req.query;
    const data = await db.query(
      `SELECT creator_history.id as requestId,  campaign.id as id, campaign_ui.id as ui_id, creator_list.cpc, creator_list.average_unique_click,
      campaign.email, campaign.name,campaign_ui.headline,campaign_ui.body,campaign_ui.cta,campaign_ui.image,campaign_ui.additional_files,
      campaign_ui.page_url,campaign.demographic,campaign.audience,campaign.position,campaign.region,campaign_ui.conversion,
      campaign.create_time,
      campaign.start_date,
      campaign.complete_date,
      campaign.state,
      campaign.url,
      user_list.company,
      user_list.team_avatar,
      SUM(clicked_history.count) AS total_clicks, 
      SUM(clicked_history.unique_click) unique_clicks, 
      SUM(CASE WHEN (clicked_history.user_medium = 'newsletter' OR clicked_history.user_medium = 'referral') AND clicked_history.duration > clicked_history.count * 0.37 AND clicked_history.duration > 0  THEN clicked_history.unique_click ELSE 0 END) verified_clicks
      from campaign 
      left join campaign_ui on campaign.id = campaign_ui.campaign_id
      left join clicked_history on clicked_history.campaign_id = campaign.id
      inner join creator_history on campaign.id = creator_history.campaign_id
      inner join creator_list on creator_list.id = creator_history.creator_id
      inner join user_list on campaign.email = user_list.email
      where creator_list.id = $1 and creator_history.state = 'PENDING' and campaign.complete_date is null and campaign.use_creator = true and campaign.state = 'active' 
	    and campaign.remaining_presspool_budget > 
	  	(SELECT creator_list.average_unique_click * creator_list.cpc 
        FROM creator_list where creator_list.id = creator_history.creator_id)
      group by campaign.id, campaign_ui.id, creator_list.cpc,creator_list.average_unique_click,user_list.company, user_list.team_avatar, creator_history.id`,
      [creatorId]
    );

    return res.status(StatusCodes.OK).json(data.rows);
  } catch (error: any) {
    console.log("error in getting campaign list:");
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const getActiveCampaigns: RequestHandler = async (
  req: Request,
  res: Response
) => {
  log.info("get campaign list called");
  try {
    const { creatorId } = req.query;
    const data = await db.query(
      `SELECT campaign.id as id, campaign_ui.id as ui_id, creator_list.cpc, creator_list.average_unique_click,campaign.uid,
      campaign.email, campaign.name,campaign_ui.headline,campaign_ui.body,campaign_ui.cta,campaign_ui.image,
      campaign_ui.page_url,campaign.demographic,campaign.audience,campaign.position,campaign.region,campaign_ui.conversion,
      campaign.create_time,
      campaign.start_date,
      campaign.complete_date,
      campaign.state,
      campaign.url,
      user_list.company,
      user_list.team_avatar,
      SUM(clicked_history.count) AS total_clicks, 
      SUM(clicked_history.unique_click) unique_clicks, 
      SUM(CASE WHEN (clicked_history.user_medium = 'newsletter' OR clicked_history.user_medium = 'referral') AND clicked_history.duration > clicked_history.count * 0.37 AND clicked_history.duration > 0  THEN clicked_history.unique_click ELSE 0 END) verified_clicks
      from campaign 
      left join campaign_ui on campaign.id = campaign_ui.campaign_id
      left join clicked_history on clicked_history.campaign_id = campaign.id
      inner join campaign_creator on campaign.id = campaign_creator.campaign_id
	    inner join creator_history on creator_history.campaign_id = campaign_creator.campaign_id and creator_history.creator_id = campaign_creator.creator_id
      inner join creator_list on creator_list.id = campaign_creator.creator_id
      inner join user_list on campaign.email = user_list.email
      where creator_list.id = $1 and campaign.state = 'active' and campaign.complete_date is null and TO_TIMESTAMP(CAST(creator_history.scheduled_date AS bigint)) < CURRENT_TIMESTAMP and creator_history.state = 'RUNNING'
      group by campaign.id, campaign_ui.id, creator_list.cpc,creator_list.average_unique_click,user_list.company, user_list.team_avatar`,
      [creatorId]
    );

    return res.status(StatusCodes.OK).json(data.rows);
  } catch (error: any) {
    console.log("error in getting campaign list:");
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const getCompletedCampaigns: RequestHandler = async (
  req: Request,
  res: Response
) => {
  log.info("get campaign list called");
  try {
    const { creatorId } = req.query;
    const data = await db.query(
      `SELECT campaign.id as id, campaign_ui.id as ui_id, creator_list.cpc, creator_list.average_unique_click,campaign.uid,
      campaign.email, campaign.name,campaign_ui.headline,campaign_ui.body,campaign_ui.cta,campaign_ui.image,
      campaign_ui.page_url,campaign.demographic,campaign.audience,campaign.position,campaign.region,campaign_ui.conversion,
      campaign.create_time,
      campaign.start_date,
      campaign.complete_date,
      campaign.state,
      campaign.url,
      user_list.company,
      user_list.team_avatar,
      SUM(clicked_history.count) AS total_clicks, 
      SUM(clicked_history.unique_click) unique_clicks, 
      SUM(CASE WHEN (clicked_history.user_medium = 'newsletter' OR clicked_history.user_medium = 'referral') AND clicked_history.duration > clicked_history.count * 0.37 AND clicked_history.duration > 0  THEN clicked_history.unique_click ELSE 0 END) verified_clicks
      from campaign 
      left join campaign_ui on campaign.id = campaign_ui.campaign_id
      left join clicked_history on clicked_history.campaign_id = campaign.id
      inner join campaign_creator on campaign.id = campaign_creator.campaign_id
      inner join creator_list on creator_list.id = campaign_creator.creator_id
      inner join user_list on campaign.email = user_list.email
      where creator_list.id = $1 and campaign.state = 'active' and campaign.complete_date is not null
      group by campaign.id, campaign_ui.id, creator_list.cpc,creator_list.average_unique_click,user_list.company, user_list.team_avatar`,
      [creatorId]
    );

    return res.status(StatusCodes.OK).json(data.rows);
  } catch (error: any) {
    console.log("error in getting campaign list:");
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const subscribeCampaign: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { scheduleDate, requestid, isReschedule } = req.body;
    const isRescheduleBoolean =
      isReschedule === "true"
        ? true
        : isReschedule === "false"
        ? false
        : Boolean(isReschedule);
    const time = moment().valueOf();
    if (isRescheduleBoolean) {
      const { rows } = await db.query(
        `UPDATE creator_history
        SET scheduled_date = $2
        FROM campaign
        WHERE creator_history.id = $1
        RETURNING creator_history.*`,
        [requestid, scheduleDate]
      );
      return res.status(StatusCodes.OK).json({
        ...rows[0],
      });
    } else {
      const { rows } = await db.query(
        `UPDATE creator_history
        SET state = $2,
        scheduled_date = $3
        FROM campaign
        WHERE creator_history.id = $1 
          AND campaign.remaining_presspool_budget >= (
            SELECT creator_list.average_unique_click * creator_list.cpc 
            FROM creator_list where creator_list.id = creator_history.creator_id
          )
        RETURNING creator_history.*`,
        [requestid, "ACCEPTED", scheduleDate]
      );
      if (rows.length > 0) {
        const [row] = rows;
        await db.query(
          `UPDATE campaign
          SET remaining_presspool_budget = remaining_presspool_budget - (
              SELECT average_unique_click * cpc
              FROM creator_list
              WHERE creator_list.id = $2
          )
          WHERE campaign.id = $1`,
          [row.campaign_id, row.creator_id]
        );
        await db.query(
          "insert into campaign_creator (create_time, campaign_id, creator_id) values ($1, $2, $3) returning *",
          [time, row.campaign_id, row.creator_id]
        );
        return res.status(StatusCodes.OK).json({
          ...rows[0],
        });
      } else {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: `Sorry! budget exceed for selected campaign` });
      }
    }
  } catch (error: any) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const rejectCampaign: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { notes, requestId, rejectDate } = req.body;
    const { rows } = await db.query(
      "update creator_history set notes = $2, rejected_date = $3, state = $4 where id = $1 RETURNING *",
      [requestId, notes, rejectDate, "REJECTED"]
    );
    return res.status(StatusCodes.OK).json({
      ...rows[0],
    });
  } catch (error: any) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const updateAvatar: RequestHandler = async (req: Request, res: Response) => {
  log.info("update profile clicked");
  try {
    if (!req.files)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "No images are provided!" });
    const avatar = (req.files as any)["avatar"]
      ? (req.files as any)["avatar"][0].location
      : null;
    const teamAvatar = (req.files as any)["team_avatar"]
      ? (req.files as any)["team_avatar"][0].location
      : null;
    const { creatorId } = req.body;
    if (avatar) {
      await db.query(
        "update creator_list set avatar = $2 where id = $1 RETURNING *",
        [creatorId, avatar]
      );
    }
    if (teamAvatar) {
      await db.query(
        "update creator_list set team_avatar = $2 where id = $1 RETURNING *",
        [creatorId, teamAvatar]
      );
    }

    return res.status(StatusCodes.OK).json({ avatar, teamAvatar });
  } catch (error: any) {
    log.error(`update profile error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
  }
};

const getNotifications: RequestHandler = async (
  req: Request,
  res: Response
) => {
  log.info("get notifications list called");
  try {
    const { creatorId } = req.query;
    const data = await db.query(
      `SELECT creator_history.id as requestId,  campaign.id as campaign_id, campaign_ui.id as ui_id,
      user_list.company
      from campaign 
      left join campaign_ui on campaign.id = campaign_ui.campaign_id
      inner join creator_history on campaign.id = creator_history.campaign_id
      inner join creator_list on creator_list.id = creator_history.creator_id
      inner join user_list on campaign.email = user_list.email
      where creator_list.id = $1 and creator_history.state not in ('PENDING','REJECTED')`,
      [creatorId]
    );

    return res.status(StatusCodes.OK).json(data.rows);
  } catch (error: any) {
    console.log("error in getting campaign list:");
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const getCampaignDetail: RequestHandler = async (
  req: Request,
  res: Response
) => {
  log.info("get campaign detail called");
  try {
    const { id } = req.query;
    const campaignData = await db.query(
      `select  
      campaign.name,
      campaign.url,
      campaign.demographic,
      campaign.newsletter,
      campaign.region,
      campaign.position,
      campaign.audience,
      campaign_ui.headline,
      campaign_ui.body,
      campaign_ui.cta,
      campaign_ui.conversion,
      campaign_ui.page_url AS PageUrl,
      'https://track.presspool.ai/' || campaign.uid AS TrackingLink,
      campaign_ui.image,
      campaign_ui.additional_files
      from campaign 
      left join campaign_ui on campaign.id = campaign_ui.campaign_id where campaign.id = $1`,
      [id]
    );

    return res.status(StatusCodes.OK).json(campaignData.rows);
  } catch (error: any) {
    log.error(` get campaign detail error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error.message);
  }
};

const authController = {
  updateCreatorPreferences,
  getCampaign,
  getNewsletter,
  getCampaignList,
  getReadyToPublish,
  getActiveCampaigns,
  getCompletedCampaigns,
  updateSubscribeProof,
  getNewRequests,
  subscribeCampaign,
  rejectCampaign,
  updateAudienceSize,
  updateAudience,
  updateTargeting,
  updateAvatar,
  getNotifications,
  getCampaignDetail,
};

export default authController;

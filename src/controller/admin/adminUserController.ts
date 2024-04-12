import { RequestHandler, Request, Response } from "express";

import db from "../../util/db";
import { StatusCodes } from "http-status-codes";

const getAccountManagerDetail: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.query;
    const { rows } = await db.query("select * from admin_user where id = $1", [
      id,
    ]);
    return res.status(StatusCodes.OK).json(rows[0]);
  } catch (error: any) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const getAccountManagers: RequestHandler = async (
  _req: Request,
  res: Response
) => {
  try {
    const assigners = await db.query(
      `SELECT * FROM (SELECT 
          admin_user.id,
          admin_user.create_time, 
          admin_user.name, 
            admin_user.email, 
            COALESCE(SUM(spent), 0) AS spent, 
            COALESCE(SUM(billed), 0) AS billed, 
            COUNT(campaign.id) AS campaign_count, 
            COUNT(DISTINCT user_list.id) AS client_count,
            SUM(CASE WHEN campaign.state = 'active' AND campaign.complete_date is null THEN 1 ELSE 0 END) AS active_count,
          SUM(CASE WHEN campaign.state = 'active' AND campaign.complete_date is not null THEN 1 ELSE 0 END) AS completed_count,
            SUM(CASE WHEN campaign.state = 'draft' THEN 1 ELSE 0 END) AS draft_count,
            SUM(CASE WHEN campaign.state IN ('active', 'completed') THEN campaign.price ELSE 0 END) AS total_budget 
        FROM 
            user_list 
        LEFT JOIN 
            campaign ON user_list.email = campaign.email 
        LEFT JOIN 
            admin_user ON user_list.id::TEXT = ANY(STRING_TO_ARRAY(admin_user.assigned_users, ','))
        WHERE admin_user.role = $1 and admin_user.assigned_users is not null
        GROUP BY 
            admin_user.id
          
        Union
        
        SELECT 
          admin_user.id,
          admin_user.create_time, 
          admin_user.name, 
            admin_user.email, 
          0 AS spent, 
            0 AS billed, 
            0 AS campaign_count, 
          0 AS client_count,
            0 AS active_count,
          0 AS completed_count,
            0 AS draft_count,
            0 AS total_budget 
        FROM admin_user WHERE admin_user.role = $1 and admin_user.assigned_users is null) AS combined_results
        ORDER BY 
            combined_results.name;`,
      ["account_manager"]
    );

    return res.status(StatusCodes.OK).json(assigners.rows);
  } catch (error: any) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const assignAccountManager: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId, assignedIds, removedIds } = req.body;
    const params = [userId, `${userId},%`, `%,${userId}`, `%,${userId},%`];
    if (removedIds?.length > 0) {
      const conditionParams = [`${userId},`, `,${userId}`, `,${userId},`];
      const unassignQuery = `UPDATE admin_user AS au
            SET assigned_users = (
              SELECT 
              CASE
                WHEN sub.assigned_users = $1 THEN ''
                WHEN sub.assigned_users LIKE $2 THEN REPLACE(sub.assigned_users, $5, '')
                WHEN sub.assigned_users LIKE $3 THEN REPLACE(sub.assigned_users, $6, '')
                WHEN sub.assigned_users LIKE $4 THEN REPLACE(sub.assigned_users, $7, ',')
                ELSE sub.assigned_users 
              END
              FROM admin_user sub
              WHERE sub.id = au.id
            )
            WHERE au.id IN (${(removedIds as string[])
              .map((x) => Number(x))
              .map((id) => "'" + id + "'")
              .join(",")})`;

      await db.query(unassignQuery, [...params, ...conditionParams]);
    }

    if (assignedIds?.length > 0) {
      const assignQuery = `UPDATE admin_user AS au
            SET assigned_users = (
              SELECT 
              CASE
                WHEN COALESCE(sub.assigned_users, '') = $1 
                OR COALESCE(sub.assigned_users, '') LIKE $2 
                OR COALESCE(sub.assigned_users, '') LIKE $3 
                OR COALESCE(sub.assigned_users, '') LIKE $4 THEN sub.assigned_users
                ELSE COALESCE(sub.assigned_users, '') || CASE WHEN COALESCE(sub.assigned_users, '') <> '' THEN ',' ELSE '' END || $1
              END
              FROM admin_user sub
              WHERE sub.id = au.id
            )
            WHERE au.id IN (${(assignedIds as string[])
              .map((x) => Number(x))
              .map((id) => "'" + id + "'")
              .join(",")})`;
      await db.query(assignQuery, params);
    }
    const admins = await db.query(
      "SELECT * from admin_user WHERE ',' || assigned_users || ',' LIKE $1",
      [`%,${userId},%`]
    );
    return res.status(StatusCodes.OK).json(admins.rows);
  } catch (error: any) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const unassignAccountManager: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId, manager } = req.body;
    console.log("id:", userId, manager);

    const origin = (
      await db.query("SELECT assigned_users from admin_user where id = $1", [
        manager,
      ])
    ).rows[0].assigned_users;
    let ids = origin.split(",");

    ids = ids.filter((item: any) => item !== userId.toString());
    console.log("ids:", ids);
    await db.query("UPDATE admin_user SET assigned_users = $1 where id = $2", [
      ids.join(","),
      manager,
    ]);
    const admins = await db.query(
      "SELECT * from admin_user WHERE ',' || assigned_users || ',' LIKE $1",
      [`%,${userId},%`]
    );
    return res.status(StatusCodes.OK).json(admins.rows);
  } catch (error: any) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const getNormalUsers: RequestHandler = async (req: Request, res: Response) => {
  console.log("get normal user:");
  try {
    const { accountManager } = req.query;
    let users: any = undefined;
    if (accountManager) {
      const assignedUsers = await db.query(
        "SELECT assigned_users FROM admin_user WHERE id = $1",
        [accountManager]
      );
      if (assignedUsers.rows[0].assigned_users) {
        const arr = assignedUsers.rows[0].assigned_users.split(",");
        users = await db.query("SELECT * from user_list WHERE id = ANY($1)", [
          arr,
        ]);
      } else {
        users = {
          rows: [],
        };
      }
    } else {
      users = await db.query("SELECT * from user_list");
    }

    return res.status(StatusCodes.OK).json(users.rows);
  } catch (error: any) {
    console.log("error getting normal user:", error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const updateAssigners: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    console.log("data:", data);

    for (const item of data) {
      await db.query(
        "UPDATE admin_user SET assigned_users = $1 where id = $2",
        [item.assigned_users, item.id]
      );
    }

    return res.status(StatusCodes.OK).json("updated!");
  } catch (error: any) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const adminUser = {
  getAccountManagers,
  assignAccountManager,
  unassignAccountManager,
  getNormalUsers,
  updateAssigners,
  getAccountManagerDetail,
};

export default adminUser;

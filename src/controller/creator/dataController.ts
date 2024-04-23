import { RequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";

import db from "../../util/db";

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
    } = req.body;
    const { rows } = await db.query(
      "update creator_list set audience_size = $2,audience= $3,industry= $4,position=$5,geography=$6,average_unique_click=$7,cpc=$8 where id = $1 RETURNING *",
      [
        creatorId,
        audienceSize,
        audience,
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

const authController = {
  updateCreatorPreferences,
};

export default authController;

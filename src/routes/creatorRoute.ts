import express, { Router } from "express";

import auth from "../controller/creator/authController";
import data from "../controller/creator/dataController";

const router: Router = express.Router();

router.post("/auth/login", auth.login);
router.post("/auth/signup", auth.signup);
router.post("/updatePreferences", data.updateCreatorPreferences);
router.get("/getCampaign", data.getCampaign);
router.get("/getNewsletter", data.getNewsletter);
router.get("/getCampaignList", data.getCampaignList);
router.get("/getCreatorDetail", auth.getCreatorDetail);
router.get("/getReadyToPublish", data.getReadyToPublish);
router.get("/getActiveCampaigns", data.getActiveCampaigns);
router.get("/getCompletedCampaigns", data.getCompletedCampaigns);

export default router;

import express, { Router } from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3 } from "@aws-sdk/client-s3";
import auth from "../controller/creator/authController";
import data from "../controller/creator/dataController";

const router: Router = express.Router();
const s3 = new S3({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_KEY as string,
  },
});
const upload = multer({
  storage: multerS3({
    s3,
    acl: "public-read",
    bucket: "presspool-upload-images",
    key: function (_req: any, file: any, cb: any) {
      cb(null, file.originalname);
    },
  }),
});

router.post("/auth/login", auth.login);
router.post("/auth/signup", auth.signup);
router.post("/auth/password", auth.sendPasswordEmail);
router.post("/auth/verify-password-email", auth.verifyPasswordEmail);
router.put("/auth/password", auth.changePassword);
router.post("/updatePreferences", data.updateCreatorPreferences);
router.post("/updateAudienceSize", data.updateAudienceSize);
router.post("/updateAudience", data.updateAudience);
router.post("/updateTargeting", data.updateTargeting);
router.put(
  "/updateSubscribeProof",
  upload.fields([{ name: "subscriber_proof", maxCount: 1 }]),
  data.updateSubscribeProof
);
router.put(
  "/updateAvatar",
  upload.fields([
    { name: "avatar", maxCount: 10 },
    { name: "team_avatar", maxCount: 2 },
  ]),
  data.updateAvatar
);
router.get("/getCampaign", data.getCampaign);
router.get("/getNewsletter", data.getNewsletter);
router.get("/getCampaignList", data.getCampaignList);
router.get("/getCreatorDetail", auth.getCreatorDetail);
router.get("/getNewRequests", data.getNewRequests);
router.get("/getReadyToPublish", data.getReadyToPublish);
router.get("/getActiveCampaigns", data.getActiveCampaigns);
router.get("/getCompletedCampaigns", data.getCompletedCampaigns);
router.put("/scheduleCampaign", data.subscribeCampaign);
router.put("/rejectCampaign", data.rejectCampaign);
router.get("/getNotifications", data.getNotifications);
router.get("/getCampaignDetail", data.getCampaignDetail);
router.get("/getAllPublications", data.getAllPublications);
router.get("/getPublicationDetail", data.getPublicationDetail);

export default router;

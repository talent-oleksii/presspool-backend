import express, { Router } from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3 } from '@aws-sdk/client-s3';
import data from '../controller/dataController';

const router: Router = express.Router();

const s3 = new S3({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_KEY as string,
  }
});
const upload = multer({
  storage: multerS3({
    s3,
    acl: 'public-read',
    bucket: 'presspool-upload-images',
    key: function (_req: any, file: any, cb: any) {
      cb(null, file.originalname);
    }
  })
});

// Define routes
router.get('/newsletter', data.getNewsletter);
router.get('/pricing', data.getPricing);
router.post('/campaign', data.addCampaign);
router.get('/campaign', data.getCampaign);
router.delete('/campaign', data.deleteCampaign);
router.post('/audience', data.addAudience);
router.get('/audience', data.getAudience);
router.get('/region', data.getRegion);
router.get('/campaign_detail', data.getCampaignDetail);
router.put('/campaign_detail', data.updateCampaignDetail);
router.post('/campaign_ui', upload.fields([
  { name: 'image', maxCount: 10 }, { name: 'additional_file' }
]), data.addCampaignUI);
router.put('/campaign_ui', upload.fields([
  { name: 'image', maxCount: 10 }, { name: 'additional_file' }
]), data.updateCampaignUI);
router.get('/audience', data.getAudience);

router.get('/profile', data.getProfile);
router.put('/profile', upload.fields([{ name: 'avatar', maxCount: 10 }]), data.updateProfile);
router.get('/unbilled', data.getUnbilled);

router.post('/team-member', data.addTeamMeber);
router.put('/team-member', data.updateTeamMember);

router.post('/clicked', data.clicked);

router.get('/guide', data.getGuide);

export default router;
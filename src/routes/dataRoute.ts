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
})

// Define routes
router.get('/newsletter', data.getNewsletter);
router.get('/pricing', data.getPricing);
router.post('/campaign', data.addCampaign);
router.get('/campaign', data.getCampaign);
router.post('/audience', data.addAudience);
router.get('/audience', data.getAudience);
router.get('/campaign_detail', data.getCampaignDetail);
router.put('/campaign_detail', data.updateCampaignDetail);
router.post('/campaign_ui', upload.fields([
  { name: 'image', maxCount: 10 }
]), data.addCampaignUI);
router.put('/campaign_ui', upload.fields([
  { name: 'image', maxCount: 10 }
]), data.updateCampaignUI);
router.get('/audience', data.getAudience);

router.get('/profile', data.getProfile);
router.put('/profile', data.updateProfile);

router.post('/clicked', data.clicked);

export default router;
import express, { Router } from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3 } from '@aws-sdk/client-s3';

import campaign from '../controller/admin/campaign';
import adminAuth from '../controller/admin/adminAuthController';
import adminData from '../controller/admin/adminDataController';
import adminUser from '../controller/admin/adminUserController';

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

router.post('/auth/login', adminAuth.signIn);
router.post('/auth/check', adminAuth.authCheck);
router.post('/auth/sign-up', adminAuth.signUp);
router.post('/auth/password', adminAuth.sendPasswordEmail);
router.post('/auth/verify-password-email', adminAuth.verifyPasswordEmail);
router.put('/auth/password', adminAuth.changePassword);

router.get('/user/account-manager', adminUser.getAccountManagers);
router.get('/user/account-manager-detail', adminUser.getAccountManagerDetail);
router.post('/user/account-manager', adminUser.assignAccountManager);
router.put('/user/account-manager', adminUser.unassignAccountManager);

router.put('/users', adminUser.updateAssigners);
router.get('/users', adminUser.getNormalUsers);

router.get('/dashboard/overview', adminData.getDashboardOverviewData);
router.get('/dashboard/campaign/list', adminData.getDashboardCampaignList);
router.get('/dashboard/campaign/detail', adminData.getDashboardCampaignDetail);
router.get('/dashboard/newsletter', adminData.getNewsletter);

router.get('/dashboard/client', adminData.getDashboardClient);
router.put('/dashboard/client', adminData.updateDashboardClient);
router.post('/dashboard/client', adminData.assignDashboardClient);

router.get('/client', adminData.getClientDetail);
router.put('/client', adminData.updateClientDetail);
router.get('/client-campaign', adminData.getClientCampaign);

router.get('/campaign', adminData.getCampaignsByClient);

router.get('/guide', adminData.getGuide);
router.post('/guide', upload.fields([
  { name: 'attach', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }
]), adminData.addGuide);
router.delete('/guide', adminData.deleteGuide);

router.get('/data/campaign', campaign.getCampaign);

router.post('/invite', adminData.inviteClient);
router.post('/invite-am', adminData.inviteAccountManager);

router.get('/getPublications', adminData.getPublications);
router.put('/approvePublication', adminData.approvePublication);
router.put('/rejectPublication', adminData.rejectPublication);

export default router;
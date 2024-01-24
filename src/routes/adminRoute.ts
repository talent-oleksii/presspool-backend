import express, { Router } from 'express';
import campaign from '../controller/admin/campaign';
import adminAuth from '../controller/admin/adminAuthController';
import adminData from '../controller/admin/adminDataController';
import adminUser from '../controller/admin/adminUserController';

const router: Router = express.Router();

// Define routes

router.post('/auth/login', adminAuth.signIn);
router.post('/auth/check', adminAuth.authCheck);
router.post('/auth/sign-up', adminAuth.signUp);

router.get('/user/account-manager', adminUser.getAccountManagers);
router.post('/user/account-manager', adminUser.assignAccountManager);
router.put('/user/account-manager', adminUser.unassignAccountManager);

router.put('/users', adminUser.updateAssigners);
router.get('/users', adminUser.getNormalUsers);

router.get('/dashboard/overview', adminData.getDashboardOverviewData);
router.get('/dashboard/campaign/list', adminData.getDashboardCampaignList);
router.get('/dashboard/campaign/detail', adminData.getDashboardCampaignDetail);

router.get('/dashboard/client', adminData.getDashboardClient);
router.put('/dashboard/client', adminData.updateDashboardClient);

router.get('/client', adminData.getClientDetail);
router.put('/client', adminData.updateClientDetail);

router.get('/data/campaign', campaign.getCampaign);

router.post('/invite', adminData.inviteClient);

export default router;
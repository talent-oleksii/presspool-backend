import express, { Router } from 'express';

import auth from '../controller/creator/authController';
import data from '../controller/creator/dataController';

const router: Router = express.Router();

router.post('/auth/login', auth.login);
router.post('/auth/signup', auth.signup);
router.post('/updatePreferences', data.updateCreatorPreferences);

export default router;
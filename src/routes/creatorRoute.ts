import express, { Router } from 'express';

import auth from '../controller/creator/authController';

const router: Router = express.Router();

router.post('/auth/login', auth.login);
router.post('/auth/signup', auth.signup);

export default router;
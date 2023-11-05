import express, { Router, Request, Response } from 'express';
import auth from '../controller/authController';

const router: Router = express.Router();

// Define routes
router.get('/sign-in', auth.signIn);
router.post('/client-sign-up', auth.clientSignUp);

export default router;
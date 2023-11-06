import express, { Router } from 'express';
import data from '../controller/dataController';

const router: Router = express.Router();

// Define routes
router.get('/newsletter', data.getNewsletter);

export default router;
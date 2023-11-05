import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

router.get('/', (req: Request, res: Response) => {
    res.send('Welcome to user route!');
});

router.get('/profile', (req: Request, res: Response) => {
    res.send('User profile page');
});

export default router;
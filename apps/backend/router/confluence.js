import { Router } from 'express';
import { getConfluencePage } from '../controllers/confluence.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Fetch Confluence page (authenticated)
router.get('/page', requireAuth, getConfluencePage);

export default router;

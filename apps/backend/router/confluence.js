import { Router } from 'express';
import { getConfluencePage } from '../controllers/confluence.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Fetch Confluence page (temporarily without auth for testing)
router.get('/page', getConfluencePage);

// Test route without auth for debugging
router.get('/test', (req, res) => {
    res.json({ message: 'Confluence router is working!' });
});

export default router;

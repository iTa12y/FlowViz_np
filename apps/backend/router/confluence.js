import { Router } from 'express';
import { getConfluencePage, analyzeConfluencePage } from '../controllers/confluence.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Fetch Confluence page content
router.get('/page', getConfluencePage);

// Analyze Confluence page content with speculation detection
router.post('/analyze', analyzeConfluencePage);

// Test route without auth for debugging
router.get('/test', (req, res) => {
    res.json({ message: 'Confluence router is working!' });
});

export default router;

import RedisService from '../services/redis.js';
import ConfluenceService from '../services/confluence_analysis.js';
import env from '../services/env.js';

const redisService = new RedisService();
const confluenceService = new ConfluenceService();

export async function getConfluencePage(req: any, res: any) {
    try {
        // Verify session and get user credentials
        const sessionId = req.cookies?.[env.SESSION_COOKIE_NAME];
        if (!sessionId) {
            return res.status(401).json({ error: "Authentication required" });
        }
        
        const username = await redisService.getSessionUsername(sessionId);
        if (!username) {
            return res.status(401).json({ error: "Invalid or expired session" });
        }
        
        // Retrieve user credentials from session
        const credentials = await redisService.getSessionCredentials(sessionId);
        
        if (!credentials) {
            return res.status(401).json({ error: "Session credentials not found. Please log in again." });
        }
        
        const { space, title } = req.query;
        
        if (!space || !title) {
            return res.status(400).json({ error: 'Both space and title query parameters are required' });
        }
        
        const content = await confluenceService.getPageCleanContentByTitle(
            credentials.username,
            credentials.api_token,
            space,
            title
        );
        
        if (content) {
            return res.status(200).json({ space, title, content });
        } else {
            return res.status(404).json({ error: 'Page not found' });
        }
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}

export async function analyzeConfluencePage(req: any, res: any) {
    try {
        const sessionId = req.cookies?.[env.SESSION_COOKIE_NAME];
        if (!sessionId) {
            return res.status(401).json({ error: "Authentication required" });
        }
        
        const username = await redisService.getSessionUsername(sessionId);
        if (!username) {
            return res.status(401).json({ error: "Invalid or expired session" });
        }
        
        const credentials = await redisService.getSessionCredentials(sessionId);
        if (!credentials) {
            return res.status(401).json({ error: "Session credentials not found. Please log in again." });
        }
        
        const { space_key, page_title } = req.body;
        
        if (!space_key || !page_title) {
            return res.status(400).json({ error: "space_key and page_title are required" });
        }
        
        // Get enhanced analysis from Confluence service
        const analysis = await confluenceService.getEnhancedPageAnalysis(
            credentials.username,
            credentials.api_token,
            space_key,
            page_title
        );
        
        if (analysis) {
            return res.status(200).json({
                success: true,
                analysis,
                page_info: {
                    space_key,
                    title: page_title,
                    confluence_url: credentials.confluence_url
                }
            });
        } else {
            return res.status(404).json({ error: "Page not found or analysis failed" });
        }
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}

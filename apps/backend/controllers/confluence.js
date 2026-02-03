import RedisService from '../services/redis.js';
import ConfluenceService from '../services/confluence_analysis.js';

const redisService = new RedisService();
const confluenceService = new ConfluenceService();

export async function getConfluencePage(req, res) {
    try {
        // Verify session and get user credentials
        const sessionId = req.cookies?.session_id;
        if (!sessionId) {
            return res.status(401).json({ error: "Authentication required" });
        }
        
        const username = await redisService.getSessionUsername(sessionId);
        if (!username) {
            return res.status(401).json({ error: "Invalid or expired session" });
        }
        
        // Retrieve user credentials from session
        console.log(`Confluence - Getting credentials for session: ${sessionId}`);
        const credentials = await redisService.getSessionCredentials(sessionId);
        console.log(`Confluence - Retrieved credentials: ${credentials !== null}`);
        
        if (!credentials) {
            console.error(`Confluence - Session credentials not found for session: ${sessionId}`);
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
    } catch (error) {
        console.error('Confluence page error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}

export async function analyzeConfluencePage(req, res) {
    try {
        const sessionId = req.cookies?.session_id;
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
    } catch (error) {
        console.error('Confluence analysis error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}

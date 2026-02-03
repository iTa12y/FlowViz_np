import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5001';

export async function getConfluencePage(req, res) {
    try {
        const { space, title } = req.query;
        
        if (!space || !title) {
            return res.status(400).json({ error: 'Both space and title query parameters are required' });
        }
        
        const sessionId = req.cookies?.session_id;
        
        const response = await axios.get(
            `${API_URL}/api/confluence/page`,
            {
                params: { space, title },
                headers: sessionId ? {
                    'Cookie': `session_id=${sessionId}`
                } : {}
            }
        );
        
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Confluence page proxy error:', error.response?.data || error.message);
        const status = error.response?.status || 500;
        const data = error.response?.data || { error: 'Failed to fetch Confluence page' };
        return res.status(status).json(data);
    }
}

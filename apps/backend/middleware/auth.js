import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5001';

export async function requireAuth(req, res, next) {
    try {
        const sessionId = req.headers['x-session-id'] || req.cookies?.session_id;
        
        if (!sessionId) {
            return res.status(401).json({ error: 'No session ID provided' });
        }
        
        // Verify session with Python API
        const response = await axios.get(`${API_URL}/api/auth/verify`, {
            headers: { 'X-Session-ID': sessionId }
        });
        
        if (response.data.valid) {
            req.user = { username: response.data.username };
            next();
        } else {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }
        
    } catch (error) {
        if (error.response?.status === 401) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        console.error('Auth middleware error:', error.message);
        return res.status(500).json({ error: 'Authentication service unavailable' });
    }
}

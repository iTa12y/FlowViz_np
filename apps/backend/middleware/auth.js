import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5001';

export async function requireAuth(req, res, next) {
    try {
        console.log('Auth middleware - All cookies:', req.cookies);
        console.log('Auth middleware - Cookie header:', req.headers.cookie);
        
        const sessionId = req.cookies?.session_id;
        
        if (!sessionId) {
            console.error('Auth middleware - No session ID in cookies');
            return res.status(401).json({ error: 'No session ID provided' });
        }
        
        console.log('Auth middleware - Verifying session:', sessionId);
        
        // Verify session with Python API by forwarding the cookie
        const response = await axios.get(`${API_URL}/api/auth/verify`, {
            headers: { 
                'Cookie': `session_id=${sessionId}`
            }
        });
        
        if (response.data.valid) {
            console.log('Auth middleware - Session valid for user:', response.data.username);
            req.user = { username: response.data.username };
            next();
        } else {
            console.error('Auth middleware - Session invalid');
            return res.status(401).json({ error: 'Invalid or expired session' });
        }
        
    } catch (error) {
        console.error('Auth middleware - Error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        console.error('Auth middleware error:', error.message);
        return res.status(500).json({ error: 'Authentication service unavailable' });
    }
}

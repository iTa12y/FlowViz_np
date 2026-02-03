import RedisService from '../services/redis.js';

const redisService = new RedisService();

export async function requireAuth(req, res, next) {
    try {
        const sessionId = req.cookies?.session_id;
        
        if (!sessionId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const username = await redisService.getSessionUsername(sessionId);
        
        if (username) {
            req.user = { username };
            next();
        } else {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }
        
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        return res.status(500).json({ error: 'Authentication failed' });
    }
}

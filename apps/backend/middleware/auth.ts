import { Request, Response, NextFunction } from 'express';
import RedisService from '../services/redis.js';

// Extend Express Request type
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      username: string;
    };
  }
}

const redisService = new RedisService();

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
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
        return res.status(500).json({ error: 'Authentication failed' });
    }
}

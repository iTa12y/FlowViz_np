import { Router } from "express";
import crypto from "crypto";
import RedisService from "../services/redis.js";
import ConfluenceService from "../services/confluence_analysis.js";
import env from "../services/env.js";

const router = Router();
const redisService = new RedisService();
const confluenceService = new ConfluenceService();

// Login endpoint - authenticate with Confluence and create session
router.post("/login", async (req: any, res: any) => {
    try {
        const { username, api_token } = req.body;
        
        if (!username || !api_token) {
            return res.status(400).json({ error: "username and api_token are required" });
        }
        
        // Check if Redis is connected
        const redisConnected = await redisService.ensureConnected();
        if (!redisConnected) {
            return res.status(503).json({ 
                error: `Session storage unavailable. Please ensure Redis is running on ${env.REDIS_HOST}:${env.REDIS_PORT}`,
                details: `Redis connection failed. Start Redis with: ${env.REDIS_START_COMMAND_HINT}` 
            });
        }
        
        // Validate credentials using ConfluenceService
        const isValid = await confluenceService.validateCredentials(username, api_token);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid Confluence credentials" });
        }
        
        const confluenceUrl = confluenceService.confluenceUrl;
        
        const sessionId = crypto.randomBytes(24).toString('base64url');
        
        const sessionCreated = await redisService.setSession(
            sessionId, username, env.SESSION_TTL_SECONDS,
            api_token, confluenceUrl
        );
        
        // Set HTTP-only cookie
        res.cookie(env.SESSION_COOKIE_NAME, sessionId, {
            httpOnly: true,
            secure: env.SESSION_COOKIE_SECURE,
            sameSite: env.SESSION_COOKIE_SAME_SITE as any,
            maxAge: env.SESSION_TTL_SECONDS * 1000,
            path: '/'
        });
        
        return res.status(200).json({
            success: true,
            username,
            message: "Authentication successful"
        });
        
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// Verify session endpoint
router.get("/verify", async (req: any, res: any) => {
    try {
        const sessionId = req.cookies?.[env.SESSION_COOKIE_NAME];
        
        if (!sessionId) {
            return res.status(401).json({ valid: false, error: "No session ID provided" });
        }
        
        const username = await redisService.getSession(sessionId);
        
        if (username) {
            return res.status(200).json({ valid: true, username });
        } else {
            return res.status(401).json({ valid: false, error: "Invalid or expired session" });
        }
        
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// Logout endpoint
router.post("/logout", async (req: any, res: any) => {
    try {
        const sessionId = req.cookies?.[env.SESSION_COOKIE_NAME];
        
        if (sessionId) {
            await redisService.deleteSession(sessionId);
        }
        
        res.clearCookie(env.SESSION_COOKIE_NAME, {
            httpOnly: true,
            secure: env.SESSION_COOKIE_SECURE,
            sameSite: env.SESSION_COOKIE_SAME_SITE as any,
            path: '/'
        });
        
        return res.status(200).json({ success: true, message: "Logged out successfully" });
        
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to check authentication status and session data
router.get("/status", async (req: any, res: any) => {
    try {
        const redisConnected = await redisService.ensureConnected();
        const sessionId = req.cookies?.[env.SESSION_COOKIE_NAME];
        
        if (!redisConnected) {
            return res.status(200).json({
                authenticated: false,
                redis_connected: false,
                error: "Redis is not available. Please start Redis server.",
                help: `Run '${env.REDIS_START_COMMAND_HINT}' in your terminal or install Redis if not installed.`
            });
        }
        
        if (!sessionId) {
            return res.status(200).json({
                authenticated: false,
                redis_connected: true,
                error: "No session cookie found"
            });
        }
        
        const username = await redisService.getSessionUsername(sessionId);
        
        return res.status(200).json({
            authenticated: !!username,
            redis_connected: true,
            username: username || null,
            session_id: sessionId ? `${sessionId.substring(0, 8)}...` : null
        });
    } catch (error: any) {
        return res.status(500).json({ 
            authenticated: false,
            error: error.message,
            redis_connected: false
        });
    }
});

// Legacy status endpoint
router.get("/status-old", async (req: any, res: any) => {
    try {
        const sessionId = req.cookies?.[env.SESSION_COOKIE_NAME];
        if (!sessionId) {
            return res.status(401).json({ error: "No session ID found" });
        }
        
        const username = await redisService.getSessionUsername(sessionId);
        const credentials = await redisService.getSessionCredentials(sessionId);
        
        return res.status(200).json({
            session_id: sessionId,
            username,
            has_credentials: credentials !== null,
            credentials_keys: credentials ? Object.keys(credentials) : null
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;

import { Router } from "express";
import crypto from "crypto";
import RedisService from "../services/redis.js";
import ConfluenceService from "../services/confluence_analysis.js";

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
        
        // Validate credentials using ConfluenceService
        const isValid = await confluenceService.validateCredentials(username, api_token);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid Confluence credentials" });
        }
        
        const confluenceUrl = confluenceService.confluenceUrl;
        
        const sessionId = crypto.randomBytes(24).toString('base64url');
        
        const sessionCreated = await redisService.setSession(
            sessionId, username, 3600, // 1 hour session
            api_token, confluenceUrl
        );
        
        // Set HTTP-only cookie
        const isProduction = process.env.NODE_ENV === 'production';
        
        res.cookie('session_id', sessionId, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 3600000 // 1 hour in milliseconds
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
        const sessionId = req.cookies?.session_id;
        
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
        const sessionId = req.cookies?.session_id;
        
        if (sessionId) {
            await redisService.deleteSession(sessionId);
        }
        
        res.clearCookie('session_id', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
        
        return res.status(200).json({ success: true, message: "Logged out successfully" });
        
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to check authentication status and session data
router.get("/status", async (req: any, res: any) => {
    try {
        const sessionId = req.cookies?.session_id;
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

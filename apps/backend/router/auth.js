import { Router } from "express";
import crypto from "crypto";
import RedisService from "../services/redis.js";
import ConfluenceService from "../services/confluence_analysis.js";

const router = Router();
const redisService = new RedisService();
const confluenceService = new ConfluenceService();

// Login endpoint - authenticate with Confluence and create session
router.post("/login", async (req, res) => {
    try {
        const { username, api_token } = req.body;
        
        if (!username || !api_token) {
            return res.status(400).json({ error: "username and api_token are required" });
        }
        
        // Validate credentials using ConfluenceService
        const isValid = await confluenceService.validateCredentials(username, api_token);
        if (!isValid) {
            console.error("Authentication failed: Invalid Confluence credentials");
            return res.status(401).json({ error: "Invalid Confluence credentials" });
        }
        
        // Get Confluence URL from service
        const confluenceUrl = confluenceService.confluenceUrl;
        
        // Create session with credentials (stored only in session, not permanently)
        const sessionId = crypto.randomBytes(24).toString('base64url');
        console.log(`Login - Creating session with ID: ${sessionId} for user: ${username}`);
        
        const sessionCreated = await redisService.setSession(
            sessionId, username, 3600, // 1 hour session
            api_token, confluenceUrl
        );
        console.log(`Login - Session creation result: ${sessionCreated}`);
        
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
        
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Verify session endpoint
router.get("/verify", async (req, res) => {
    try {
        console.log('=== VERIFY REQUEST DEBUG ===');
        console.log('All cookies:', req.cookies);
        
        const sessionId = req.cookies?.session_id;
        
        if (!sessionId) {
            console.log("Verify - No session ID found");
            return res.status(401).json({ valid: false, error: "No session ID provided" });
        }
        
        console.log(`Verify - Looking up session_id in Redis: ${sessionId}`);
        const username = await redisService.getSession(sessionId);
        console.log(`Verify - Redis returned username: ${username}`);
        
        if (username) {
            return res.status(200).json({ valid: true, username });
        } else {
            return res.status(401).json({ valid: false, error: "Invalid or expired session" });
        }
        
    } catch (error) {
        console.error('Verify session error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Logout endpoint
router.post("/logout", async (req, res) => {
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
        
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to check authentication status and session data
router.get("/status", async (req, res) => {
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
    } catch (error) {
        console.error('Status error:', error);
        return res.status(500).json({ error: error.message });
    }
});

export default router;

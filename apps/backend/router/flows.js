import { Router } from "express";
import RedisService from "../services/redis.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const redisService = new RedisService();

// Get all flows for authenticated user
router.get("/", requireAuth, async (req, res) => {
    try {
        const sessionId = req.cookies?.session_id;
        
        if (!sessionId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const username = await redisService.getSessionUsername(sessionId);
        if (!username) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }
        
        const flows = await redisService.getUserFlows(username);
        return res.status(200).json({ flows });
    } catch (error) {
        console.error('Get flows error:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

// Save or update a flow
router.post("/", requireAuth, async (req, res) => {
    try {
        const sessionId = req.cookies?.session_id;
        
        if (!sessionId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const username = await redisService.getSessionUsername(sessionId);
        if (!username) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }
        
        const flowData = req.body;
        if (!flowData) {
            return res.status(400).json({ error: 'Flow data is required' });
        }
        
        const result = await redisService.saveUserFlow(username, flowData);
        return res.status(201).json({ success: result, flow: flowData });
    } catch (error) {
        console.error('Save flow error:', error.message);
        console.error('Stack trace:', error.stack);
        return res.status(500).json({ error: error.message });
    }
});

// Delete a specific flow
router.delete("/:flowId", requireAuth, async (req, res) => {
    try {
        const sessionId = req.cookies?.session_id;
        const { flowId } = req.params;
        
        if (!sessionId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const username = await redisService.getSessionUsername(sessionId);
        if (!username) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }
        
        if (!flowId) {
            return res.status(400).json({ error: 'Flow ID is required' });
        }
        
        const result = await redisService.deleteUserFlow(username, flowId);
        return res.status(200).json({ success: result });
    } catch (error) {
        console.error('Delete flow error:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

export default router;

import { Router } from "express";
import axios from "axios";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const API_URL = process.env.API_URL || 'http://localhost:5001';

console.log('Flows router loaded successfully');

// Add middleware to log all requests to flows router
router.use((req, res, next) => {
    console.log(`Flows router: ${req.method} ${req.path} - Request received`);
    next();
});

// Get all flows for authenticated user
router.get("/", requireAuth, async (req, res) => {
    try {
        const sessionId = req.cookies?.session_id;
        
        const response = await axios.get(
            `${API_URL}/api/flows`,
            {
                headers: {
                    'Cookie': `session_id=${sessionId}`
                }
            }
        );
        
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Get flows proxy error:', error.response?.data || error.message);
        const status = error.response?.status || 500;
        const data = error.response?.data || { error: 'Failed to get flows' };
        return res.status(status).json(data);
    }
});

// Save or update a flow
router.post("/", requireAuth, async (req, res) => {
    console.log('Flows router: POST / hit');
    try {
        const sessionId = req.cookies?.session_id;
        
        const response = await axios.post(
            `${API_URL}/api/flows`,
            req.body,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `session_id=${sessionId}`
                }
            }
        );
        
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Save flow proxy error:', error.response?.data || error.message);
        const status = error.response?.status || 500;
        const data = error.response?.data || { error: 'Failed to save flow' };
        return res.status(status).json(data);
    }
});

// Delete a specific flow
router.delete("/:flowId", requireAuth, async (req, res) => {
    try {
        const sessionId = req.cookies?.session_id;
        const { flowId } = req.params;
        
        const response = await axios.delete(
            `${API_URL}/api/flows/${flowId}`,
            {
                headers: {
                    'Cookie': `session_id=${sessionId}`
                }
            }
        );
        
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Delete flow proxy error:', error.response?.data || error.message);
        const status = error.response?.status || 500;
        const data = error.response?.data || { error: 'Failed to delete flow' };
        return res.status(status).json(data);
    }
});

export default router;

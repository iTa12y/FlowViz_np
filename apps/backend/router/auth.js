import { Router } from "express";
import axios from "axios";

const router = Router();
const API_URL = process.env.API_URL || 'http://localhost:5001';

// Proxy login to Flask API
router.post("/login", async (req, res) => {
    try {
        const response = await axios.post(
            `${API_URL}/api/auth/login`,
            req.body,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        // Parse and re-set cookie for backend domain
        const setCookie = response.headers['set-cookie'];
        console.log('Login - Flask API Set-Cookie header:', setCookie);
        
        if (setCookie && setCookie.length > 0) {
            // Extract session_id value from Set-Cookie header
            const cookieStr = setCookie[0];
            const sessionMatch = cookieStr.match(/session_id=([^;]+)/);
            
            if (sessionMatch) {
                const sessionId = sessionMatch[1];
                console.log('Login - Setting cookie with session_id:', sessionId);
                
                // Re-set cookie with proper attributes for backend
                res.cookie('session_id', sessionId, {
                    httpOnly: true,
                    secure: false, // Set to true in production with HTTPS
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 3600000 // 1 hour in milliseconds
                });
            }
        }
        
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Login proxy error:', error.message);
        const status = error.response?.status || 500;
        const data = error.response?.data || { error: 'Login failed' };
        return res.status(status).json(data);
    }
});

// Proxy verify to Flask API
router.get("/verify", async (req, res) => {
    try {
        console.log('=== VERIFY REQUEST DEBUG ===');
        console.log('All cookies:', req.cookies);
        console.log('Raw cookie header:', req.headers.cookie);
        
        const sessionId = req.cookies?.session_id;
        
        if (!sessionId) {
            console.error('No session_id cookie found in request');
            return res.status(401).json({ error: 'No session ID in cookie' });
        }
        
        const cookieToSend = `session_id=${sessionId}`;
        console.log('Sending Cookie header to API:', cookieToSend);
        
        const response = await axios.get(
            `${API_URL}/api/auth/verify`,
            {
                headers: {
                    'Cookie': cookieToSend
                }
            }
        );
        
        console.log('API response status:', response.status);
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Verify proxy error:', error.response?.data || error.message);
        const status = error.response?.status || 500;
        const data = error.response?.data || { error: 'Verification failed' };
        return res.status(status).json(data);
    }
});

// Proxy logout to Flask API
router.post("/logout", async (req, res) => {
    try {
        const sessionId = req.cookies?.session_id;
        
        const response = await axios.post(
            `${API_URL}/api/auth/logout`,
            {},
            {
                headers: sessionId ? {
                    'Cookie': `session_id=${sessionId}`
                } : {}
            }
        );
        
        // Clear cookie on backend side
        res.clearCookie('session_id', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
        });
        
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Logout proxy error:', error.message);
        const status = error.response?.status || 500;
        const data = error.response?.data || { error: 'Logout failed' };
        return res.status(status).json(data);
    }
});

export default router;

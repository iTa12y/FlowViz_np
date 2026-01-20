import { Router } from 'express'
import { validateIncident } from '../middleware/incident.js';
import { requireAuth } from '../middleware/auth.js';
import { requestFlowPrompt } from '../controllers/incident.js';

const router = Router();

// Protected route - requires authentication
router.post("/analyze", requireAuth, validateIncident, requestFlowPrompt)

export default router;
import { Router } from 'express'
import { validateIncident } from '../middleware/incident.js';
import { requireAuth } from '../middleware/auth.js';
import { requestFlowPrompt, requestAllFlows } from '../controllers/incident.js';

const router = Router();

// Protected route - requires authentication
router.post("/analyze", requireAuth, validateIncident, requestFlowPrompt)
router.post("/analyze-all", requireAuth, validateIncident, requestAllFlows)

export default router;
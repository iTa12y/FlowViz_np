import { Request, Response, NextFunction } from 'express';
import { FLOW_PROMPTS } from '../services/gpt.js'

export async function validateIncident(req: Request, res: Response, next: NextFunction) {
    const { description, flowType } = req.body;

    if (
      typeof description !== "string" ||
      description.length < 20 ||
      description.length > 5000
    ) {
      return res.status(400).json({ error: "Invalid description" });
    }

    if (flowType && !FLOW_PROMPTS[flowType as keyof typeof FLOW_PROMPTS]) {
      return res.status(400).json({ error: "Invalid flow type" });
    }

    next()
}
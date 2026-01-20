import { FLOW_PROMPTS } from '../services/gpt.js'

export async function validateIncident(req, res, next) {
    const { description, flowType } = req.body;

    if (
      typeof description !== "string" ||
      description.length < 20 ||
      description.length > 5000
    ) {
      return res.status(400).json({ error: "Invalid description" });
    }

    if (!FLOW_PROMPTS[flowType]) {
      return res.status(400).json({ error: "Invalid flow type" });
    }

    next()
}
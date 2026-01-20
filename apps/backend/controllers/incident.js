import { openai, FLOW_PROMPTS, SYSTEM_PROMPT, FLOW_RESPONSES } from "../services/gpt.js"

export async function requestFlowPrompt(req, res) {
    try {
        const { flowType, description } = req.body;
        console.log(FLOW_PROMPTS[flowType](description))
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            temperature: 0.3,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `${FLOW_PROMPTS[flowType](description)}` }
            ],
            response_format: FLOW_RESPONSES[flowType]
        });

        return res.status(200).json({ result: completion.choices[0].message.content })
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Analysis failed" });
    }
}
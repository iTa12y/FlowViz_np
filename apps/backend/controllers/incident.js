import { openai, FLOW_PROMPTS, SYSTEM_PROMPT, RESPONSE_FORMATS } from "../services/gpt.js"

export async function requestFlowPrompt(req, res) {
    try {
        const { flowType, description } = req.body;
        // Removed verbose prompt logging
        let completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.3,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `${FLOW_PROMPTS[flowType](description)}` }
            ],
            response_format: RESPONSE_FORMATS[flowType]
        });

        let content = completion.choices[0].message.content;
        // Validate and retry if suggestions are generic
        try {
            const parsed = JSON.parse(content);
            if (parsed && Array.isArray(parsed.nodes)) {
                const hasGeneric = parsed.nodes.some(n => {
                    if (n.type !== 'question_mark') return false;
                    const s = (n.investigation_suggestions || '').toLowerCase();
                    // generic phrases blacklist
                    return [
                        'windows event logs',
                        'system logs',
                        'network traffic',
                        'suspicious activity'
                    ].some(ph => s.includes(ph));
                });

                if (hasGeneric) {
                    // Retry once with stricter reminder and explicit instruction to use exact wording
                    const reminder = `Your previous suggestions were too generic. Regenerate with ONLY incident-specific artifacts and reference the exact entities from this description verbatim. Avoid phrases like 'Windows Event Logs', 'system logs', 'network traffic' unless tied to a SPECIFIC system from the incident.`;
                    completion = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        temperature: 0.2,
                        messages: [
                            { role: "system", content: SYSTEM_PROMPT },
                            { role: "user", content: `${FLOW_PROMPTS[flowType](description)}` },
                            { role: "user", content: reminder }
                        ],
                        response_format: RESPONSE_FORMATS[flowType]
                    });
                    content = completion.choices[0].message.content;
                }
            }
        } catch (e) {
            // If parsing failed, return as-is
        }

        return res.status(200).json({ result: content })
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Analysis failed" });
    }
}
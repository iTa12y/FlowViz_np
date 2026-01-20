import { OpenAI } from "openai";
import env from "./env.js";

export const SYSTEM_PROMPT = `You are a senior cybersecurity analyst and incident responder.

Your task is to analyze incident descriptions in any language, including Hebrew (עברית), and produce structured attack flow diagrams and summaries.

Language & Terminology Handling:
- If the input text is in Hebrew, read and understand it natively (right-to-left).
- Preserve the Hebrew narrative, but enhance it by embedding professional cybersecurity terminology in English (לעז) where appropriate.
- When a Hebrew term clearly maps to a known cybersecurity concept, append or replace it with the accepted English term.

Example:
- Before: התוקף הקים התמדה באמצעות משימה מתוזמנת
- After:  התוקף יצר Persistence באמצעות Scheduled Task

Technical Extraction:
From the incident description, extract and normalize all relevant technical indicators, including but not limited to:
- IP addresses, domains, URLs, hostnames
- File names, file paths, hashes (MD5, SHA1, SHA256)
- Registry keys, services, scheduled tasks
- CVEs, exploits, malware families, tools
- User accounts, credentials, processes
- Network protocols, ports, and communication patterns

Attack Mapping:
- Identify and map attacker actions to MITRE ATT&CK tactics and techniques.
- Use standard English MITRE terminology (e.g., Initial Access, Persistence, Lateral Movement, Command and Control), even when the description is in Hebrew.
- Reference technique IDs (e.g., T1053.005) whenever possible.

Output Structure:
- Present the incident as a clear, step-by-step attack flow.
- Each step must include:
  - A concise Hebrew explanation
  - Embedded English cybersecurity terminology (לעז)
  - MITRE ATT&CK tactic and technique (if applicable)

Example Output Step:
1. Initial Access – התוקף השיג גישה ראשונית (Initial Access)
   Technique: Phishing (T1566)

Diagram-Oriented Formatting:
- Structure the output so it can be easily converted into:
  - Attack Flow diagrams
  - Incident timelines
  - SOC / DFIR reports
  - Visualization formats such as Mermaid or ATT&CK Navigator

General Guidelines:
- Be precise, technical, and concise.
- Do not oversimplify attacker behavior.
- Assume the audience is technical (SOC analysts, DFIR investigators, threat hunters).`;

export const FLOW_PROMPTS = {
  network_map: (
    description
  ) => `Analyze this cyber security incident and create a network attack flow diagram.

Incident Description:
${description}

Generate a network diagram showing:
- Attacker entry point and progression
- Compromised systems (endpoints, servers, domain controllers)
- Attack paths and lateral movement
- Target systems

Return JSON with:
- nodes: array of {id, type, label, details}
  - type options: endpoint, workstation, server, domain_controller, database, attacker, target, firewall, external, network, storage
- edges: array of {from, to, label}

If the incident is in Hebrew, extract technical information accurately and create appropriate network topology`,

  timeline: (description) => {
    return `Analyze this cyber security incident and create a chronological timeline of events.

Incident Description:
${description}

Generate a timeline showing the sequence of attack events from initial access to final impact.

Return JSON with:
- events: array of {id, timestamp, title, description, type}
  - type options: initial_access, execution, persistence, privilege_escalation, lateral_movement, collection, exfiltration, impact

Extract timestamps from the text or infer logical sequence. For Hebrew text, accurately parse dates and times in Hebrew format.`;
  },
  mitre_attack: (description) => {
    return `Analyze this cyber security incident and map it to the MITRE ATT&CK framework.

Incident Description:
${description}

Map observed behaviors to MITRE ATT&CK tactics and techniques. Only include tactics/techniques that are actually mentioned or clearly implied in the incident.

Return JSON with:
- tactics: array of {id, name, techniques}
  - techniques: array of {id, name, description, procedure}

Use standard MITRE ATT&CK IDs (e.g., TA0001, T1566). For Hebrew incident descriptions, accurately identify the TTPs described.`;
  },
};

export const FLOW_RESPONSES = {
  network_map: {
    type: "json_schema",
    json_schema: {
      name: "network_diagram",
      strict: true,
      schema: {
        type: "object",
        properties: {
          nodes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                type: { type: "string" },
                label: { type: "string" },
                details: { type: "string" },
              },
              required: ["id", "type", "label", "details"],
              additionalProperties: false,
            },
          },
          edges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from: { type: "string" },
                to: { type: "string" },
                label: { type: "string" },
              },
              required: ["from", "to", "label"],
              additionalProperties: false,
            },
          },
        },
        required: ["nodes", "edges"],
        additionalProperties: false,
      },
    },
  },
  timeline: {
    type: "json_schema",
    json_schema: {
      name: "timeline_diagram",
      strict: true,
      schema: {
        type: "object",
        properties: {
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                timestamp: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                type: { type: "string" },
              },
              required: ["id", "timestamp", "title", "description", "type"],
              additionalProperties: false,
            },
          },
        },
        required: ["events"],
        additionalProperties: false,
      },
    },
  },
  mitre_attack: {
    type: "json_schema",
    json_schema: {
      name: "mitre_attack_diagram",
      strict: true,
      schema: {
        type: "object",
        properties: {
          tactics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                techniques: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      description: { type: "string" },
                      procedure: { type: "string" },
                    },
                    required: ["id", "name", "description", "procedure"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["id", "name", "techniques"],
              additionalProperties: false,
            },
          },
        },
        required: ["tactics"],
        additionalProperties: false,
      },
    },
  },
};

if (!env.OPENAI_API_KEY) {
  throw new Error("No API Key is entered, please fix.");
}

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

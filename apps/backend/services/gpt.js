import { OpenAI } from "openai";
import https from "https";
import env from "./env.js";

export const SYSTEM_PROMPT = `You are a senior cybersecurity analyst and incident responder with specialized expertise in attack flow analysis.

Your task is to analyze incident descriptions in any language, including Hebrew (עברית), and produce structured attack flow diagrams while clearly distinguishing between confirmed attack actions, investigative findings, and speculative theories.

CRITICAL CLASSIFICATION FRAMEWORK:
1. ATTACK FLOW ELEMENTS (confirmed attack actions):
   - Direct evidence of attacker activity
   - Confirmed system compromises
   - Verified lateral movement
   - Proven data exfiltration or impact
   - Technical artifacts with high confidence

2. INVESTIGATION STEPS (legitimate analysis actions):
   - Analyst research activities
   - Log analysis and review
   - Tool execution for investigation
   - Hypothesis testing actions
   - Evidence collection processes

3. SPECULATIONS & ASSUMPTIONS (uncertain elements):
   - Potential attack vectors not yet confirmed
   - Theoretical next steps in attack progression
   - Missing information that needs investigation
   - Possible but unverified attack methods
   - Gaps in the attack timeline

SPECIAL HANDLING FOR MISSING INFORMATION:
When you encounter gaps in the attack flow or unclear progression:
- DO NOT fill gaps with assumptions
- DO NOT create speculative attack steps
- INSTEAD: Create "question_mark" components with:
  - Type: "question_mark"
  - Description: List all possible scenarios for this gap
  - Investigation_suggestions: What needs to be checked/analyzed
  - Confidence_level: "unknown" or "requires_investigation"

Language & Terminology Handling:
- If the input text is in Hebrew, read and understand it natively (right-to-left)
- Preserve the Hebrew narrative, but enhance it by embedding professional cybersecurity terminology in English (לעז) where appropriate
- When a Hebrew term clearly maps to a known cybersecurity concept, append or replace it with the accepted English term

Example:
- Before: התוקף הקים התמדה באמצעות משימה מתוזמנת
- After: התוקף יצר Persistence באמצעות Scheduled Task

OUTPUT REQUIREMENTS:
For Network Maps & Timeline Analysis:
- ONLY include confirmed attack flow elements
- Mark investigative steps with type: "investigation_step"
- Replace missing/uncertain elements with question_mark components
- Provide clear confidence levels for each element

For Speculation Filtering (from Confluence):
- Identify speculation markers: "maybe", "possibly", "could be", "might have", "we think", "probably"
- Hebrew speculation markers: "יכול להיות", "אולי", "ייתכן", "נראה כי", "סביר להניח"
- Separate these into question_mark components
- Only include verified attack flow elements in main diagrams

Technical Extraction Guidelines:
From incident descriptions, extract and normalize:
- IP addresses, domains, URLs, hostnames
- File names, file paths, hashes (MD5, SHA1, SHA256)
- Registry keys, services, scheduled tasks
- CVEs, exploits, malware families, tools
- User accounts, credentials, processes
- Network protocols, ports, and communication patterns

Attack Mapping Standards:
- Map confirmed actions to MITRE ATT&CK tactics and techniques
- Use standard English MITRE terminology
- Reference technique IDs (e.g., T1053.005) when applicable
- Mark uncertain mappings as question_mark components

General Guidelines:
- Prioritize accuracy over completeness
- Clearly distinguish fact from theory
- Provide actionable investigation guidance
- Assume technical SOC/DFIR audience
- Never fabricate attack steps to complete flows`;

export const FLOW_PROMPTS = {
  network_map: (description) => `Analyze this cyber security incident and create a network attack flow diagram.

CLASSIFICATION REQUIREMENTS:
- Only include CONFIRMED attack elements in the main flow
- Mark investigation activities separately
- Use question_mark components for gaps or uncertainties
- Filter out speculation and assumptions

Incident Description:
${description}

Generate a network diagram showing ONLY confirmed elements:
- Verified attacker entry points and progression
- Confirmed compromised systems (endpoints, servers, domain controllers)
- Proven attack paths and lateral movement
- Verified target systems

For missing or uncertain elements, create question_mark components that describe:
- What information is missing
- Possible attack vectors to investigate
- Questions that need answers
- Technical checks to perform

Return JSON with:
- nodes: array of {id, type, label, details, confidence_level}
  - type options: endpoint, workstation, server, domain_controller, database, attacker, target, firewall, external, network, storage, question_mark, investigation_step
  - confidence_level: "confirmed", "likely", "uncertain", "requires_investigation"
- edges: array of {from, to, label, confidence_level}

If the incident is in Hebrew, extract technical information accurately while filtering speculation.`,

  timeline: (description) => `Analyze this cyber security incident and create a chronological timeline of CONFIRMED events only.

FILTERING REQUIREMENTS:
- Include only verified attack actions with timestamps
- Separate investigation activities from attack flow
- Use question_mark components for timeline gaps
- Do not assume or fill missing time periods

Incident Description:
${description}

Generate a timeline showing ONLY confirmed sequence of attack events:
- Verified initial access with timestamps
- Confirmed execution and persistence events
- Proven lateral movement with timing
- Verified data collection/exfiltration
- Confirmed impact events

For timeline gaps or uncertain events, create question_mark entries with:
- Possible events that could have occurred
- Time windows that need investigation
- What evidence to look for
- Technical artifacts to examine

Return JSON with:
- events: array of {id, timestamp, title, description, type, confidence_level}
  - type options: initial_access, execution, persistence, privilege_escalation, lateral_movement, collection, exfiltration, impact, question_mark, investigation_step
  - confidence_level: "confirmed", "likely", "uncertain", "requires_investigation"

Extract exact timestamps from text or mark as "requires_investigation" if timing is unclear.`,

  mitre_attack: (description) => `Analyze this cyber security incident and map ONLY CONFIRMED behaviors to the MITRE ATT&CK framework.

STRICT MAPPING REQUIREMENTS:
- Only include tactics/techniques with clear evidence
- Mark uncertain mappings as question_mark components
- Separate investigation activities from attack techniques
- Provide confidence levels for all mappings

Incident Description:
${description}

Map ONLY observed and verified behaviors to MITRE ATT&CK:
- Confirmed tactics and techniques with evidence
- Clear procedure descriptions
- High-confidence technique identification

For uncertain or missing technique mappings, create question_mark entries with:
- Possible techniques that might apply
- Additional evidence needed
- Investigation questions for confirmation
- Alternative technique possibilities

Return JSON with:
- tactics: array of {id, name, techniques, confidence_level}
  - techniques: array of {id, name, description, procedure, confidence_level, evidence_quality}
  - confidence_level: "confirmed", "likely", "uncertain", "requires_investigation"
  - evidence_quality: "strong", "moderate", "weak", "speculation"

Only use standard MITRE ATT&CK IDs (e.g., TA0001, T1566) for confirmed techniques.

Be precise, technical, and concise.
Do not oversimplify attacker behavior.
Assume the audience is technical (SOC analysts, DFIR investigators, threat hunters).`,
};

export const RESPONSE_FORMATS = {
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
                type: { 
                  type: "string",
                  enum: ["endpoint", "workstation", "server", "domain_controller", "database", "attacker", "target", "firewall", "external", "network", "storage", "question_mark", "investigation_step"]
                },
                label: { type: "string" },
                details: { type: "string" },
                confidence_level: { 
                  type: "string",
                  enum: ["confirmed", "likely", "uncertain", "requires_investigation"]
                },
                investigation_suggestions: { type: "string" },
                possible_scenarios: { type: "string" }
              },
              required: ["id", "type", "label", "details", "confidence_level"],
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
                confidence_level: { 
                  type: "string",
                  enum: ["confirmed", "likely", "uncertain", "requires_investigation"]
                }
              },
              required: ["from", "to", "label", "confidence_level"],
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
                type: { 
                  type: "string",
                  enum: ["initial_access", "execution", "persistence", "privilege_escalation", "lateral_movement", "collection", "exfiltration", "impact", "question_mark", "investigation_step"]
                },
                confidence_level: { 
                  type: "string",
                  enum: ["confirmed", "likely", "uncertain", "requires_investigation"]
                },
                investigation_suggestions: { type: "string" },
                possible_scenarios: { type: "string" }
              },
              required: ["id", "timestamp", "title", "description", "type", "confidence_level"],
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
                confidence_level: { 
                  type: "string",
                  enum: ["confirmed", "likely", "uncertain", "requires_investigation"]
                },
                techniques: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      description: { type: "string" },
                      procedure: { type: "string" },
                      confidence_level: { 
                        type: "string",
                        enum: ["confirmed", "likely", "uncertain", "requires_investigation"]
                      },
                      evidence_quality: { 
                        type: "string",
                        enum: ["strong", "moderate", "weak", "speculation"]
                      },
                      investigation_suggestions: { type: "string" },
                      possible_scenarios: { type: "string" }
                    },
                    required: ["id", "name", "description", "procedure", "confidence_level", "evidence_quality"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["id", "name", "techniques", "confidence_level"],
              additionalProperties: false,
            },
          },
        },
        required: ["tactics"],
        additionalProperties: false,
      },
    },
  }
};

if (!env.OPENAI_API_KEY) {
  throw new Error("No API Key is entered, please fix.");
}

// Create HTTPS agent that disables SSL verification (ONLY for development/testing)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // Disable SSL certificate validation
});

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  httpAgent: httpsAgent, // Use the custom agent
});

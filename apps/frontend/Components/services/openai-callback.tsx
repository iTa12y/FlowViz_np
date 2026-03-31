/**
 * Calls backend API to analyze incident
 * Uses absolute URL to backend in development
 */
import { withApiBase } from '@/utils';

export async function analyzeIncident({ description, flowType }) {
  const res = await fetch(withApiBase('/api/analyze'), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include", // Send cookies automatically
    body: JSON.stringify({
      description,
      flowType
    })
  });

  if (!res.ok) {
    throw new Error("Backend analysis failed");
  }

  return res.json();
}

/**
 * Backend presence check
 */
export function isOpenAIConfigured() {
  return true;
}

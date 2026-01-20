/**
 * Calls backend API to analyze incident
 * Uses absolute URL to backend in development
 */
export async function analyzeIncident({ description, flowType }) {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const sessionId = localStorage.getItem('session_id');
  
  const res = await fetch(`${apiUrl}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId
    },
    credentials: "include",
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

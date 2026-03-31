export function createPageUrl(pageName: string): string {
  if (!pageName) return "/";
  let cleaned = pageName.trim();
  cleaned = cleaned.replace(/^[/#]+/, "");
  cleaned = cleaned.replace(/}+$/, "");
  return `/${cleaned}`;
}

declare global {
  interface Window {
    __ENV__?: Record<string, string | undefined>;
  }
}

export function getFrontendEnvVar(name: string, fallback = ''): string {
  const runtimeEnv = typeof window !== 'undefined' ? window.__ENV__ ?? {} : {};
  const buildEnv = import.meta.env as Record<string, string | undefined>;

  return runtimeEnv[name] ?? buildEnv[name] ?? fallback;
}

function getRuntimeEnvVar(name: string): string {
  const runtimeEnv = typeof window !== 'undefined' ? window.__ENV__ ?? {} : {};
  return runtimeEnv[name] ?? '';
}

export function getFrontendEnvNumber(name: string, fallback: number): number {
  const rawValue = getFrontendEnvVar(name, '');
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getApiBaseUrl(): string {
  // Prefer runtime-injected env, then build-time env, then same-origin API proxy.
  return (
    getFrontendEnvVar('VITE_AUTH_API_URL') ||
    getFrontendEnvVar('VITE_API_URL') ||
    '/api'
  );
}

export function withApiBase(path: string): string {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!baseUrl) {
    return normalizedPath;
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '');

  if (normalizedBase.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${normalizedBase}${normalizedPath.slice(4)}`;
  }

  return `${normalizedBase}${normalizedPath}`;
}

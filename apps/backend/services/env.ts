import dotenv from 'dotenv'

dotenv.config()

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined) return fallback
    return value.toLowerCase() === 'true'
}

function normalizeOrigin(origin: string): string {
    return origin.trim().replace(/\/+$/, '')
}

function parseOrigins(value: string | undefined, fallbackOrigin: string): string[] {
    if (!value) {
        return [normalizeOrigin(fallbackOrigin)]
    }

    const parsedOrigins = value
        .split(',')
        .map((origin) => normalizeOrigin(origin))
        .filter(Boolean)

    return parsedOrigins.length > 0 ? parsedOrigins : [normalizeOrigin(fallbackOrigin)]
}

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const corsOrigins = parseOrigins(process.env.CORS_ORIGINS, frontendUrl)

// When cookies are served over HTTPS (secure=true) the SameSite attribute must
// be 'none' for cross-origin fetch requests to include the cookie (e.g. OpenShift
// where the frontend route and backend route are different hostnames).
// In local development (secure=false) 'lax' is the safer default.
const sessionCookieSecure = parseBoolean(process.env.SESSION_COOKIE_SECURE, process.env.NODE_ENV === 'production')
const sessionCookieSameSite = process.env.SESSION_COOKIE_SAME_SITE ?? (sessionCookieSecure ? 'none' : 'lax')

export default {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? null,
    CONFLUENCE_URL: process.env.CONFLUENCE_URL ?? null,
    REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
    REDIS_PORT: process.env.REDIS_PORT ?? 6379,
    REDIS_USERNAME: process.env.REDIS_USERNAME ?? null,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD ?? null,
    REDIS_CONNECT_TIMEOUT: process.env.REDIS_CONNECT_TIMEOUT ? parseInt(process.env.REDIS_CONNECT_TIMEOUT) : 30000,
    CORS_ORIGINS: corsOrigins,
    PORT: process.env.PORT ? parseInt(process.env.PORT) : 3001,
    FRONTEND_URL: normalizeOrigin(frontendUrl),
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : 60000,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) : 50,
    REQUEST_BODY_SIZE_LIMIT: process.env.REQUEST_BODY_SIZE_LIMIT ?? '50kb',
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    SESSION_TTL_SECONDS: process.env.SESSION_TTL_SECONDS ? parseInt(process.env.SESSION_TTL_SECONDS) : 3600,
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? 'session_id',
    SESSION_COOKIE_SAME_SITE: sessionCookieSameSite,
    SESSION_COOKIE_SECURE: sessionCookieSecure,
    REDIS_START_COMMAND_HINT: process.env.REDIS_START_COMMAND_HINT ?? 'redis-server'
}
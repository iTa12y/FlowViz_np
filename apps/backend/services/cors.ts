import cors from 'cors'
import env from './env.js'

function normalizeOrigin(origin: string): string {
    return origin.trim().replace(/\/+$/, '')
}

function originToRegex(pattern: string): RegExp | null {
    if (!pattern.includes('*')) return null
    const escaped = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
    return new RegExp(`^${escaped}$`)
}

function isOriginAllowed(requestOrigin: string, allowedOrigins: string[]): boolean {
    const normalizedRequestOrigin = normalizeOrigin(requestOrigin)

    for (const allowedOrigin of allowedOrigins) {
        const normalizedAllowedOrigin = normalizeOrigin(allowedOrigin)

        if (normalizedAllowedOrigin === '*' || normalizedAllowedOrigin === normalizedRequestOrigin) {
            return true
        }

        const wildcardRegex = originToRegex(normalizedAllowedOrigin)
        if (wildcardRegex?.test(normalizedRequestOrigin)) {
            return true
        }
    }

    return false
}

// Build the cors middleware once at startup so both app.use(applyCors())
// and any explicit route usage share the same singleton instance.
const corsMiddleware = cors({
    origin: (origin, callback) => {
        // Allow server-to-server / same-origin requests that have no Origin header
        if (!origin) {
            callback(null, true)
            return
        }

        const allowedOrigins = env.CORS_ORIGINS

        if (isOriginAllowed(origin, allowedOrigins)) {
            callback(null, true)
            return
        }

        // Use callback(null, false) instead of callback(new Error(...)) so Express
        // does NOT route to the error handler.  The route handler still runs and
        // returns its normal status code; the browser just won't receive the
        // Access-Control-Allow-Origin header and will block the response — the
        // intended CORS rejection behaviour without a spurious 500.
        console.warn(`[CORS] Blocked request from origin: ${origin} — allowed: [${allowedOrigins.join(', ')}]`)
        callback(null, false)
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Session-ID", "X-Requested-With"],
    exposedHeaders: ["X-Request-ID"],
    credentials: true,
    optionsSuccessStatus: 204,
    preflightContinue: false,
    maxAge: 86400
})

export function applyCors() {
    return corsMiddleware
}
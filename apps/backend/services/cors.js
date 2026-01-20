import cors from 'cors'

export function applyCors() {
    return cors({
        origin: ["http://localhost:5173"],
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Session-ID"],
        credentials: true
    })
}
import dotenv from 'dotenv'

dotenv.config()

export default {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? null,
    CONFLUENCE_URL: process.env.CONFLUENCE_URL ?? null,
    REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
    REDIS_PORT: process.env.REDIS_PORT ?? 6379
}
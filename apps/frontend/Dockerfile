# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Install git (required by pnpm for some packages)
RUN apk add --no-cache git

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY apps/frontend/package.json ./apps/frontend/

# Create public directory before install
RUN mkdir -p apps/frontend/public

# Install dependencies (skip postinstall to avoid errors in Docker)
RUN pnpm install --frozen-lockfile --filter frontend... --ignore-scripts

# Copy frontend source
COPY apps/frontend ./apps/frontend/

# Manually copy PDF.js worker file after installation
RUN cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs apps/frontend/public/

# Build frontend (skip tsc type-checking for Docker builds)
RUN cd apps/frontend && pnpm vite build

# Production stage
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Copy built assets from workspace build
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/frontend/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Generate runtime env.js from container env vars
COPY --chmod=755 apps/frontend/nginx/40-env-config.sh /docker-entrypoint.d/40-env-config.sh

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Copy workspace package files
COPY package*.json ./
COPY apps/frontend/package.json ./apps/frontend/

# Install all dependencies (needed for vite)
RUN npm install

# Copy frontend source
COPY apps/frontend ./apps/frontend/

# Build from workspace
RUN npm run build --workspace=frontend

# Production stage
FROM nginx:alpine

# Copy built assets from workspace build
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/frontend/nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
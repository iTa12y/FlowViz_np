# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Copy root package files and the frontend workspace package to enable workspace install
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/package.json

# Install all workspace dependencies at the root
RUN npm ci

# Copy repository files and build the frontend workspace
COPY . .
RUN npm run --workspace=frontend build --if-present

FROM nginx:alpine
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
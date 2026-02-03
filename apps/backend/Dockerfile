FROM node:22-alpine

WORKDIR /app

# Copy root package files and backend workspace package for workspace install
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/package.json

# Install dependencies for all workspaces (node_modules at root)
RUN npm ci --production

# Copy repository and run backend from the backend workspace folder
COPY . .
WORKDIR /app/apps/backend

EXPOSE 3001
CMD ["node", "server.js"]
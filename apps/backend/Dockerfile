FROM node:22-alpine

WORKDIR /app

# Copy workspace package files
COPY package*.json ./
COPY apps/backend/package.json ./apps/backend/

# Install production dependencies
RUN npm ci --omit=dev

# Copy backend source
COPY apps/backend ./apps/backend/

# Set working directory to backend app
WORKDIR /app/apps/backend

EXPOSE 3001

CMD ["node", "server.js"]
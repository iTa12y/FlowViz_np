FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/backend/package.json ./apps/backend/

RUN npm ci --omit=dev

COPY apps/backend ./apps/backend/

WORKDIR /app/apps/backend

EXPOSE 3001

CMD ["node", "server.js"]
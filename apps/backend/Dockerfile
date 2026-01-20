FROM node:22-alpine

WORKDIR /app/src/backend

COPY src/backend/package*.json ./
RUN npm ci --production

COPY src/backend/ .

EXPOSE 3001
CMD ["node", "server.js"]
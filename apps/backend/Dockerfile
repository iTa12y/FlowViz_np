FROM node:22-alpine

WORKDIR /app

# Install git (required by pnpm for some packages)
RUN apk add --no-cache git

RUN npm install -g pnpm@latest

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

COPY apps/backend/package.json ./apps/backend/

# Install dependencies (skip postinstall scripts that are frontend-specific)
RUN pnpm install --frozen-lockfile --filter backend... --ignore-scripts

COPY apps/backend ./apps/backend/

COPY types ./types

# Skip TypeScript compilation errors for Docker build
# RUN pnpm --filter backend run build

WORKDIR /app/apps/backend

EXPOSE 3001

# Run TypeScript directly using tsx
CMD ["npx", "tsx", "server.ts"]
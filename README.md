# FlowViz App - Production Deployment Guide

A React-based incident flow visualization application with AI-powered diagram generation capabilities.

## Table of Contents

- [Quick Start (Local Development)](#quick-start-local-development)
- [Overview](#overview)
- [Current Architecture](#current-architecture)
- [Production Integration Guide](#production-integration-guide)
  - [1. PostgreSQL Integration](#1-postgresql-integration)
  - [2. SSO Authentication](#2-sso-authentication)
  - [3. Security Hardening](#3-security-hardening)
  - [4. Custom OpenAI Endpoint Integration](#4-custom-openai-endpoint-integration)
- [Deployment](#deployment)
- [OpenShift Deployment (Frontend + Backend)](./OPENSHIFT_DEPLOYMENT.md)
- [OpenShift Resources Guide](./OPENSHIFT_RESOURCES_GUIDE.md)
- [Migration from localStorage](#migration-from-localstorage)
- [Troubleshooting](#troubleshooting)

---

## Quick Start (Local Development)

### Prerequisites

1. **Node.js 18+** and **pnpm**
2. **Redis** (required for session management)
3. **Confluence Account** with API token
4. **OpenAI API Key**

### Install Redis

**Windows:**
```bash
# Download and install from:
https://github.com/tporadowski/redis/releases
# Or use Chocolatey:
choco install redis-64
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
```

### Start Redis

```bash
redis-server
```

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### Setup Application

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment variables:**
   
   Copy the example environment file:
   ```bash
   cp .env.example apps/backend/.env
   ```
   
   Then edit `apps/backend/.env` with your values:
   ```env
   # OpenAI Configuration (Required)
   VITE_OPENAI_API_KEY=sk-your-openai-api-key
   
   # Confluence Configuration (Required)
   CONFLUENCE_URL=https://your-domain.atlassian.net
   CONFLUENCE_SPACE=YOUR_SPACE
   
   # Redis (defaults to localhost:6379 for local dev)
   REDIS_HOST=localhost
   REDIS_PORT=6379
  REDIS_USERNAME=
   
   # Optional
   NODE_ENV=development
   ```

3. **Start the application:**
   ```bash
   pnpm dev
   ```
   This starts both frontend (http://localhost:5173) and backend (http://localhost:3001)

4. **Login** with your Confluence credentials:
   - Username: your-email@company.com
   - API Token: [Generate here](https://id.atlassian.com/manage-profile/security/api-tokens)

### Troubleshooting Login Issues

If you see "Redis Not Connected" on the login page:
- Make sure Redis is running: `redis-cli ping`
- Check Redis connection: `redis-cli` then `PING`
- Restart Redis: `redis-server`

If login fails with backend errors:
- Verify backend is running on port 3001
- Check console for detailed error messages
- Ensure Confluence credentials are correct

---

## Overview

FlowViz is a containerized application that helps visualize incident flows and processes using AI-powered diagram generation. This guide will help you transition from the current localStorage-based implementation to a production-ready setup with PostgreSQL and SSO authentication.

## Current Architecture

**Tech Stack:**
- Frontend: React + Vite
- Backend: Node.js + Express
- Current Storage: Browser localStorage
- AI Integration: OpenAI GPT-4

**Services:**
- Backend API (Port 3001)
- Frontend (Port 5173/80 in production)

---

## Production Integration Guide

### 1. PostgreSQL Integration

#### 1.1 Add PostgreSQL to Docker Compose

Update your `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: flowviz-postgres
    environment:
      POSTGRES_DB: flowviz
      POSTGRES_USER: flowviz_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/backend/db/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U flowviz_user -d flowviz"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: 
      context: .
      dockerfile: ./src/backend/Dockerfile
    container_name: flowviz-backend
    env_file:
      - ./src/backend/.env
    environment:
      DATABASE_URL: postgresql://flowviz_user:${POSTGRES_PASSWORD}@postgres:5432/flowviz
      NODE_ENV: production
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build: 
      context: .
      dockerfile: ./src/frontend/Dockerfile
    container_name: flowviz-frontend
    ports:
      - "5173:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 1.2 Create Database Schema

Create `src/backend/db/init.sql`:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for SSO integration
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    sso_provider VARCHAR(50),
    sso_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Incident flows table
CREATE TABLE incident_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    flow_type VARCHAR(100),
    diagram_data JSONB NOT NULL,
    nodes JSONB,
    edges JSONB,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Sessions table for JWT refresh tokens
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Indexes for performance
CREATE INDEX idx_incident_flows_user_id ON incident_flows(user_id);
CREATE INDEX idx_incident_flows_created_date ON incident_flows(created_date DESC);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_sso_id ON users(sso_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to incident_flows
CREATE TRIGGER update_incident_flows_updated_date
    BEFORE UPDATE ON incident_flows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### 1.3 Install Backend Dependencies

Update `src/backend/package.json`:

```json
{
  "name": "backend",
  "type": "module",
  "scripts": {
    "dev": "node server.js",
    "migrate": "node db/migrate.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.4.0",
    "dotenv": "^16.4.5",
    "openai": "^4.0.0",
    "pg": "^8.11.3",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "passport": "^0.7.0",
    "passport-oauth2": "^1.8.0",
    "express-session": "^1.18.0",
    "connect-pg-simple": "^9.0.1"
  }
}
```

#### 1.4 Create Database Service

Create `src/backend/services/database.js`:

```javascript
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getClient() {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Set a timeout of 5 seconds
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  client.query = (...args) => {
    return query.apply(client, args);
  };

  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
}

export default { query, getClient, pool };
```

#### 1.5 Create Flow Repository

Create `src/backend/repositories/flowRepository.js`:

```javascript
import db from '../services/database.js';

export const FlowRepository = {
  async create(userId, flowData) {
    const { title, description, flow_type, diagram_data, nodes, edges } = flowData;
    
    const result = await db.query(
      `INSERT INTO incident_flows 
       (user_id, title, description, flow_type, diagram_data, nodes, edges) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [userId, title, description, flow_type, diagram_data, nodes, edges]
    );
    
    return result.rows[0];
  },

  async findByUserId(userId, limit = null, offset = 0) {
    let query = `
      SELECT * FROM incident_flows 
      WHERE user_id = $1 AND is_deleted = false 
      ORDER BY created_date DESC
    `;
    
    const params = [userId];
    
    if (limit) {
      query += ` LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    }
    
    const result = await db.query(query, params);
    return result.rows;
  },

  async findById(flowId, userId) {
    const result = await db.query(
      `SELECT * FROM incident_flows 
       WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
      [flowId, userId]
    );
    
    return result.rows[0];
  },

  async update(flowId, userId, updates) {
    const allowedFields = ['title', 'description', 'diagram_data', 'nodes', 'edges'];
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(flowId, userId);
    const result = await db.query(
      `UPDATE incident_flows 
       SET ${setClause.join(', ')}, updated_date = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} AND is_deleted = false
       RETURNING *`,
      values
    );

    return result.rows[0];
  },

  async softDelete(flowId, userId) {
    const result = await db.query(
      `UPDATE incident_flows 
       SET is_deleted = true, updated_date = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 
       RETURNING id`,
      [flowId, userId]
    );

    return result.rows[0];
  }
};
```

---

### 2. SSO Authentication

#### 2.1 Choose Your SSO Provider

This guide supports multiple providers. Choose one:

**Option A: OAuth 2.0 / OpenID Connect (Generic)**
- Works with: Google, Microsoft Azure AD, Okta, Auth0, Keycloak
- Most flexible and widely supported

**Option B: SAML 2.0**
- Enterprise-focused
- Common in large organizations

We'll focus on **OAuth 2.0/OIDC** as it's most common.

#### 2.2 Environment Configuration

Update `src/backend/.env`:

```env
# Database
DATABASE_URL=postgresql://flowviz_user:YOUR_PASSWORD@postgres:5432/flowviz
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD

# JWT Configuration
JWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY_MIN_32_CHARS
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# SSO Configuration (choose your provider)
SSO_PROVIDER=google  # or 'azure', 'okta', 'auth0'

# Google OAuth (if using Google)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# Azure AD (if using Microsoft)
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-tenant-id
AZURE_CALLBACK_URL=https://yourdomain.com/api/auth/azure/callback

# Okta (if using Okta)
OKTA_DOMAIN=your-domain.okta.com
OKTA_CLIENT_ID=your-okta-client-id
OKTA_CLIENT_SECRET=your-okta-client-secret
OKTA_CALLBACK_URL=https://yourdomain.com/api/auth/okta/callback

# Application
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
SESSION_SECRET=YOUR_SESSION_SECRET_MIN_32_CHARS

# OpenAI
OPENAI_API_KEY=your-openai-key
```

#### 2.3 Create Authentication Service

Create `src/backend/services/auth.js`:

```javascript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './database.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export const AuthService = {
  // Generate access token
  generateAccessToken(userId, email) {
    return jwt.sign(
      { userId, email, type: 'access' },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRY }
    );
  },

  // Generate refresh token
  generateRefreshToken(userId, email) {
    return jwt.sign(
      { userId, email, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRY }
    );
  },

  // Verify token
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  },

  // Create or update user from SSO
  async upsertSSOUser(profile, provider) {
    const { id, email, name } = profile;
    
    const result = await db.query(
      `INSERT INTO users (email, name, sso_provider, sso_id, last_login)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (sso_id) 
       DO UPDATE SET 
         last_login = CURRENT_TIMESTAMP,
         name = EXCLUDED.name,
         email = EXCLUDED.email
       RETURNING *`,
      [email, name, provider, id]
    );

    return result.rows[0];
  },

  // Store refresh token
  async storeRefreshToken(userId, token, ipAddress, userAgent) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await db.query(
      `INSERT INTO user_sessions (user_id, refresh_token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, token, expiresAt, ipAddress, userAgent]
    );
  },

  // Validate refresh token
  async validateRefreshToken(token) {
    const result = await db.query(
      `SELECT * FROM user_sessions 
       WHERE refresh_token = $1 AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    return result.rows[0];
  },

  // Revoke refresh token
  async revokeRefreshToken(token) {
    await db.query(
      `DELETE FROM user_sessions WHERE refresh_token = $1`,
      [token]
    );
  },

  // Clean expired tokens
  async cleanExpiredTokens() {
    await db.query(
      `DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP`
    );
  }
};
```

#### 2.4 Create Authentication Middleware

Create `src/backend/middleware/auth.js`:

```javascript
import { AuthService } from '../services/auth.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = AuthService.verifyToken(token);

  if (!decoded || decoded.type !== 'access') {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.user = {
    userId: decoded.userId,
    email: decoded.email
  };

  next();
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const decoded = AuthService.verifyToken(token);
    if (decoded && decoded.type === 'access') {
      req.user = {
        userId: decoded.userId,
        email: decoded.email
      };
    }
  }

  next();
}
```

#### 2.5 Create SSO Strategies

Create `src/backend/auth/strategies.js`:

```javascript
import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { AuthService } from '../services/auth.js';

// Google OAuth Strategy
export function setupGoogleStrategy() {
  passport.use('google', new OAuth2Strategy({
    authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenURL: 'https://oauth2.googleapis.com/token',
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Fetch user info from Google
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const userInfo = await response.json();
      
      const user = await AuthService.upsertSSOUser({
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name
      }, 'google');
      
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
}

// Azure AD Strategy
export function setupAzureStrategy() {
  passport.use('azure', new OAuth2Strategy({
    authorizationURL: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize`,
    tokenURL: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    clientID: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    callbackURL: process.env.AZURE_CALLBACK_URL,
    scope: ['openid', 'profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const userInfo = await response.json();
      
      const user = await AuthService.upsertSSOUser({
        id: userInfo.id,
        email: userInfo.mail || userInfo.userPrincipalName,
        name: userInfo.displayName
      }, 'azure');
      
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
}

// Okta Strategy
export function setupOktaStrategy() {
  passport.use('okta', new OAuth2Strategy({
    authorizationURL: `https://${process.env.OKTA_DOMAIN}/oauth2/v1/authorize`,
    tokenURL: `https://${process.env.OKTA_DOMAIN}/oauth2/v1/token`,
    clientID: process.env.OKTA_CLIENT_ID,
    clientSecret: process.env.OKTA_CLIENT_SECRET,
    callbackURL: process.env.OKTA_CALLBACK_URL,
    scope: ['openid', 'profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const response = await fetch(`https://${process.env.OKTA_DOMAIN}/oauth2/v1/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const userInfo = await response.json();
      
      const user = await AuthService.upsertSSOUser({
        id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name
      }, 'okta');
      
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
}

export function setupPassport() {
  const provider = process.env.SSO_PROVIDER?.toLowerCase();
  
  switch (provider) {
    case 'google':
      setupGoogleStrategy();
      break;
    case 'azure':
      setupAzureStrategy();
      break;
    case 'okta':
      setupOktaStrategy();
      break;
    default:
      console.warn('No SSO provider configured');
  }

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
      done(null, result.rows[0]);
    } catch (error) {
      done(error, null);
    }
  });
}
```

#### 2.6 Create Authentication Routes

Create `src/backend/router/auth.js`:

```javascript
import express from 'express';
import passport from 'passport';
import { AuthService } from '../services/auth.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// SSO Login Initiation
router.get('/login/:provider', (req, res, next) => {
  const provider = req.params.provider;
  passport.authenticate(provider, { session: false })(req, res, next);
});

// SSO Callback
router.get('/:provider/callback', (req, res, next) => {
  const provider = req.params.provider;
  
  passport.authenticate(provider, { session: false }, async (err, user) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
    }

    try {
      // Generate tokens
      const accessToken = AuthService.generateAccessToken(user.id, user.email);
      const refreshToken = AuthService.generateRefreshToken(user.id, user.email);

      // Store refresh token
      await AuthService.storeRefreshToken(
        user.id,
        refreshToken,
        req.ip,
        req.get('user-agent')
      );

      // Redirect to frontend with tokens
      res.redirect(
        `${process.env.FRONTEND_URL}/auth/callback?access_token=${accessToken}&refresh_token=${refreshToken}`
      );
    } catch (error) {
      console.error('Token generation error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
    }
  })(req, res, next);
});

// Refresh Token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    // Verify refresh token
    const decoded = AuthService.verifyToken(refreshToken);
    
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    // Validate in database
    const session = await AuthService.validateRefreshToken(refreshToken);
    
    if (!session) {
      return res.status(403).json({ error: 'Refresh token not found or expired' });
    }

    // Generate new access token
    const accessToken = AuthService.generateAccessToken(decoded.userId, decoded.email);

    res.json({ accessToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    try {
      await AuthService.revokeRefreshToken(refreshToken);
    } catch (error) {
      console.error('Token revocation error:', error);
    }
  }

  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, sso_provider, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
```

#### 2.7 Update Server Configuration

Update `src/backend/server.js`:

```javascript
import express from "express";
import rateLimit from "express-rate-limit";
import passport from "passport";
import session from "express-session";
import helmet from "helmet";
import incidentRouter from "./router/incident.js";
import authRouter from "./router/auth.js";
import { applyCors } from "./services/cors.js";
import { setupPassport } from "./auth/strategies.js";
import { AuthService } from "./services/auth.js";

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
}));

// CORS
app.use(applyCors());

// Body parsing
app.use(express.json({ limit: "50kb" }));
app.set("trust proxy", 1);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());
setupPassport();

// Routes
app.use("/api/auth", authRouter);
app.use("/api", incidentRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Clean expired tokens every hour
setInterval(() => {
  AuthService.cleanExpiredTokens().catch(console.error);
}, 60 * 60 * 1000);

app.listen(3001, () =>
  console.log("Backend running on port 3001")
);
```

#### 2.8 Update Incident Routes to Use Authentication

Update `src/backend/router/incident.js`:

```javascript
import express from "express";
import { requestFlowPrompt } from "../controllers/incident.js";
import { authenticateToken } from "../middleware/auth.js";
import { FlowRepository } from "../repositories/flowRepository.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Generate flow with AI
router.post("/incident/generate", requestFlowPrompt);

// Create flow
router.post("/flows", async (req, res) => {
  try {
    const flow = await FlowRepository.create(req.user.userId, req.body);
    res.status(201).json(flow);
  } catch (error) {
    console.error('Flow creation error:', error);
    res.status(500).json({ error: 'Failed to create flow' });
  }
});

// Get user's flows
router.get("/flows", async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const flows = await FlowRepository.findByUserId(
      req.user.userId,
      limit ? parseInt(limit) : null,
      offset ? parseInt(offset) : 0
    );
    res.json(flows);
  } catch (error) {
    console.error('Flow fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch flows' });
  }
});

// Get specific flow
router.get("/flows/:id", async (req, res) => {
  try {
    const flow = await FlowRepository.findById(req.params.id, req.user.userId);
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json(flow);
  } catch (error) {
    console.error('Flow fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch flow' });
  }
});

// Update flow
router.put("/flows/:id", async (req, res) => {
  try {
    const flow = await FlowRepository.update(
      req.params.id,
      req.user.userId,
      req.body
    );
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json(flow);
  } catch (error) {
    console.error('Flow update error:', error);
    res.status(500).json({ error: 'Failed to update flow' });
  }
});

// Delete flow
router.delete("/flows/:id", async (req, res) => {
  try {
    const result = await FlowRepository.softDelete(req.params.id, req.user.userId);
    if (!result) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json({ message: 'Flow deleted successfully' });
  } catch (error) {
    console.error('Flow deletion error:', error);
    res.status(500).json({ error: 'Failed to delete flow' });
  }
});

export default router;
```

---

### 3. Security Hardening

#### 3.1 Environment Variables Security

**Production Checklist:**

```bash
# Generate secure random strings for secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- ✅ Use strong, unique passwords (min 32 characters)
- ✅ Store secrets in environment variables or secret management service (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)
- ✅ Never commit `.env` files
- ✅ Rotate secrets regularly (every 90 days)
- ✅ Use different credentials for different environments

#### 3.2 Database Security

**Best Practices:**

1. **Connection Security:**
   - Always use SSL/TLS for database connections in production
   - Use connection pooling with limits
   - Set connection timeouts

2. **Access Control:**
   - Create separate database users for different services
   - Use principle of least privilege
   - Enable row-level security if needed

3. **Backups:**
   ```bash
   # Automated backup script
   pg_dump -U flowviz_user -d flowviz -F c -f backup_$(date +%Y%m%d_%H%M%S).dump
   ```

4. **Monitoring:**
   - Enable PostgreSQL logging
   - Monitor slow queries
   - Set up alerts for connection pool exhaustion

#### 3.3 API Security

**Already Implemented:**
- ✅ Rate limiting (30 requests/minute)
- ✅ Helmet.js for security headers
- ✅ CORS configuration
- ✅ Request size limits (50kb)

**Additional Recommendations:**

Create `src/backend/middleware/security.js`:

```javascript
// Input validation middleware
export function validateFlowInput(req, res, next) {
  const { title, diagram_data } = req.body;
  
  if (!title || title.length > 500) {
    return res.status(400).json({ error: 'Invalid title' });
  }
  
  if (!diagram_data) {
    return res.status(400).json({ error: 'diagram_data is required' });
  }
  
  // Validate JSON size
  const jsonSize = JSON.stringify(diagram_data).length;
  if (jsonSize > 1000000) { // 1MB limit
    return res.status(400).json({ error: 'Diagram data too large' });
  }
  
  next();
}

// XSS protection
export function sanitizeInput(req, res, next) {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    }
  }
  next();
}
```

#### 3.4 Frontend Security

Update frontend to use tokens. Create `src/frontend/services/auth.js`:

```javascript
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const AuthManager = {
  setTokens(accessToken, refreshToken) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  getAccessToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  clearTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  isAuthenticated() {
    return !!this.getAccessToken();
  },

  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const { accessToken } = await response.json();
      localStorage.setItem(TOKEN_KEY, accessToken);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }
};

// Axios/Fetch interceptor
export async function authenticatedFetch(url, options = {}) {
  const token = AuthManager.getAccessToken();
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  let response = await fetch(url, { ...options, headers });

  // If unauthorized, try to refresh token
  if (response.status === 401 || response.status === 403) {
    const refreshed = await AuthManager.refreshAccessToken();
    
    if (refreshed) {
      // Retry with new token
      headers.Authorization = `Bearer ${AuthManager.getAccessToken()}`;
      response = await fetch(url, { ...options, headers });
    } else {
      // Redirect to login
      window.location.href = '/login';
      throw new Error('Authentication expired');
    }
  }

  return response;
}
```

Create login page `src/frontend/Pages/Login.jsx`:

```jsx
import React from 'react';
import { Button } from '../Components/ui/button';

export default function Login() {
  const ssoProvider = import.meta.env.VITE_SSO_PROVIDER || 'google';
  
  const handleSSOLogin = () => {
    window.location.href = `/api/auth/login/${ssoProvider}`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">
          FlowViz Login
        </h1>
        
        <Button 
          onClick={handleSSOLogin}
          className="w-full"
        >
          Sign in with SSO
        </Button>
        
        <p className="text-sm text-gray-600 mt-4 text-center">
          Secure authentication using {ssoProvider}
        </p>
      </div>
    </div>
  );
}
```

Create callback handler `src/frontend/Pages/AuthCallback.jsx`:

```jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthManager } from '../services/auth';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error');

    if (error) {
      console.error('Authentication error:', error);
      navigate('/login?error=' + error);
      return;
    }

    if (accessToken && refreshToken) {
      AuthManager.setTokens(accessToken, refreshToken);
      navigate('/');
    } else {
      navigate('/login?error=missing_tokens');
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Completing authentication...</div>
    </div>
  );
}
```

---

### 4. Custom OpenAI Endpoint Integration

FlowViz supports integration with custom OpenAI-compatible endpoints hosted in your private environment. This is useful for:
- Using Azure OpenAI Service
- Self-hosted OpenAI-compatible models (LocalAI, Ollama, etc.)
- Private enterprise AI gateways
- Custom proxy/routing layers

#### 4.1 Configuration

Add the following environment variables to your `src/backend/.env`:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://your-custom-endpoint.company.com/v1
OPENAI_MODEL=gpt-4  # or your custom model name
OPENAI_MAX_TOKENS=4096
OPENAI_TEMPERATURE=0.7

# Optional: Custom Headers (for authentication/routing)
OPENAI_CUSTOM_HEADER_NAME=X-Custom-Auth
OPENAI_CUSTOM_HEADER_VALUE=your-custom-value

# Optional: Request Timeout (in milliseconds)
OPENAI_TIMEOUT=60000

# Optional: Retry Configuration
OPENAI_MAX_RETRIES=3
```

#### 4.2 Update GPT Service

Modify `src/backend/services/gpt.js` to support custom endpoints:

```javascript
import OpenAI from 'openai';

// Initialize OpenAI client with custom configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000'),
  maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
  defaultHeaders: process.env.OPENAI_CUSTOM_HEADER_NAME ? {
    [process.env.OPENAI_CUSTOM_HEADER_NAME]: process.env.OPENAI_CUSTOM_HEADER_VALUE
  } : {}
});

export async function generateDiagram(description, flowType) {
  try {
    const model = process.env.OPENAI_MODEL || 'gpt-4';
    const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '4096');
    const temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7');

    console.log(`Using OpenAI endpoint: ${process.env.OPENAI_BASE_URL || 'default'}`);
    console.log(`Model: ${model}`);

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are a cybersecurity expert..."
        },
        {
          role: "user",
          content: description
        }
      ],
      temperature: temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}
```

#### 4.3 Azure OpenAI Setup

For Azure OpenAI Service, use these settings:

```bash
# Azure OpenAI Configuration
OPENAI_API_KEY=your-azure-api-key
OPENAI_BASE_URL=https://your-resource-name.openai.azure.com/openai/deployments/your-deployment-name
OPENAI_MODEL=gpt-4  # Your deployment name
OPENAI_API_VERSION=2024-02-15-preview

# Note: Azure requires api-version in the URL
```

Update the service for Azure compatibility:

```javascript
// For Azure, you need to use the Azure-specific client
import { AzureOpenAI } from 'openai';

const isAzure = process.env.OPENAI_BASE_URL?.includes('azure.com');

const client = isAzure 
  ? new AzureOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      endpoint: process.env.OPENAI_BASE_URL,
      apiVersion: process.env.OPENAI_API_VERSION || '2024-02-15-preview'
    })
  : new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL
    });
```

#### 4.4 Custom Model/Self-Hosted Setup

For self-hosted or custom models (LocalAI, Ollama, vLLM, etc.):

```bash
# Self-Hosted Configuration Example
OPENAI_API_KEY=not-needed  # Some implementations don't require a key
OPENAI_BASE_URL=http://your-internal-server:8000/v1
OPENAI_MODEL=mistral-7b-instruct  # Your model name
OPENAI_MAX_TOKENS=2048
OPENAI_TEMPERATURE=0.7

# For Ollama specifically
# OPENAI_BASE_URL=http://ollama-server:11434/v1
# OPENAI_MODEL=llama2
```

#### 4.5 Custom Headers and Authentication

For enterprise gateways that require custom authentication:

```bash
# Custom Authentication
OPENAI_CUSTOM_HEADER_NAME=X-API-Gateway-Key
OPENAI_CUSTOM_HEADER_VALUE=your-gateway-token

# Or for multiple headers, update the code to support comma-separated values:
OPENAI_CUSTOM_HEADERS=X-API-Key:key123,X-Tenant-Id:tenant456
```

Update service to support multiple headers:

```javascript
// Parse custom headers from environment
function parseCustomHeaders() {
  const headersEnv = process.env.OPENAI_CUSTOM_HEADERS;
  if (!headersEnv) return {};
  
  const headers = {};
  headersEnv.split(',').forEach(pair => {
    const [key, value] = pair.split(':');
    if (key && value) {
      headers[key.trim()] = value.trim();
    }
  });
  return headers;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
  defaultHeaders: parseCustomHeaders()
});
```

#### 4.6 SSL/TLS Configuration for Internal Endpoints

For internal endpoints with self-signed certificates:

```javascript
import https from 'https';
import OpenAI from 'openai';

const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === 'production' && 
                       process.env.OPENAI_VERIFY_SSL !== 'false',
  // Optional: Provide custom CA certificate
  ca: process.env.OPENAI_CA_CERT ? 
      fs.readFileSync(process.env.OPENAI_CA_CERT) : undefined
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
  httpAgent: httpsAgent
});
```

Environment variables:

```bash
# SSL Configuration
OPENAI_VERIFY_SSL=true  # Set to 'false' for self-signed certs (NOT recommended for production)
OPENAI_CA_CERT=/path/to/custom-ca-cert.pem  # Optional custom CA certificate
```

#### 4.7 Testing Custom Endpoint

Create a test script `src/backend/scripts/test-openai.js`:

```javascript
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
});

async function testConnection() {
  console.log('Testing OpenAI endpoint...');
  console.log(`Base URL: ${process.env.OPENAI_BASE_URL || 'default'}`);
  console.log(`Model: ${process.env.OPENAI_MODEL || 'gpt-4'}`);
  
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [{ role: 'user', content: 'Say "test successful"' }],
      max_tokens: 50
    });
    
    console.log('✅ Connection successful!');
    console.log('Response:', response.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return false;
  }
}

testConnection();
```

Run the test:

```bash
cd src/backend
node scripts/test-openai.js
```

#### 4.8 Monitoring and Logging

Add request logging for debugging:

```javascript
// Enhanced error handling with detailed logging
export async function generateDiagram(description, flowType) {
  const startTime = Date.now();
  
  try {
    console.log(`[OpenAI] Request started - Type: ${flowType}, Length: ${description.length}`);
    
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [...],
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096')
    });
    
    const duration = Date.now() - startTime;
    console.log(`[OpenAI] Request completed in ${duration}ms`);
    console.log(`[OpenAI] Tokens used: ${completion.usage?.total_tokens || 'unknown'}`);
    
    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[OpenAI] Request failed after ${duration}ms`);
    console.error('[OpenAI] Error details:', {
      message: error.message,
      status: error.status,
      type: error.type,
      endpoint: process.env.OPENAI_BASE_URL
    });
    throw error;
  }
}
```

#### 4.9 Troubleshooting Custom Endpoints

**Common Issues:**

1. **Connection Refused:**
   - Check if the endpoint URL is accessible from the backend container
   - Verify firewall rules and network policies
   - Test with `curl` from the backend container:
     ```bash
     docker-compose exec backend curl -v https://your-endpoint.com/v1/models
     ```

2. **Authentication Failed:**
   - Verify API key is correct
   - Check if custom headers are required
   - Ensure API key has proper permissions

3. **SSL Certificate Errors:**
   - For self-signed certs, set `OPENAI_VERIFY_SSL=false` (development only)
   - Provide custom CA certificate via `OPENAI_CA_CERT`
   - Ensure certificate chain is complete

4. **Model Not Found:**
   - List available models: `GET /v1/models`
   - Verify model name matches deployment name
   - Check model availability in your endpoint

5. **Timeout Issues:**
   - Increase `OPENAI_TIMEOUT` value
   - Check network latency to endpoint
   - Monitor endpoint performance

6. **Rate Limiting:**
   - Configure rate limits in backend middleware
   - Implement exponential backoff
   - Add request queuing if needed

**Example debug commands:**

```bash
# Test endpoint connectivity
curl -X GET "https://your-endpoint.com/v1/models" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Test completion request
curl -X POST "https://your-endpoint.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
  }'
```

---

## Migration from localStorage

### Step 1: Export Existing Data

Create `src/frontend/utils/exportData.js`:

```javascript
export function exportLocalStorageData() {
  const data = localStorage.getItem('incident_flows');
  if (!data) {
    console.log('No data to export');
    return null;
  }

  const flows = JSON.parse(data);
  const blob = new Blob([JSON.stringify(flows, null, 2)], { 
    type: 'application/json' 
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flowviz_export_${Date.now()}.json`;
  a.click();
  
  return flows;
}
```

### Step 2: Import to Database

Create migration endpoint in backend:

```javascript
// In src/backend/router/incident.js
router.post("/migrate/import", authenticateToken, async (req, res) => {
  const { flows } = req.body;
  
  if (!Array.isArray(flows)) {
    return res.status(400).json({ error: 'Invalid data format' });
  }

  try {
    const imported = [];
    for (const flow of flows) {
      const newFlow = await FlowRepository.create(req.user.userId, {
        title: flow.title || 'Untitled Flow',
        description: flow.description,
        flow_type: flow.flow_type,
        diagram_data: flow.diagram_data || flow,
        nodes: flow.nodes,
        edges: flow.edges
      });
      imported.push(newFlow);
    }

    res.json({ 
      message: `Successfully imported ${imported.length} flows`,
      flows: imported 
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});
```

---

## Deployment

### Production Deployment Checklist

#### 1. Pre-deployment

- [ ] Set all environment variables in production
- [ ] Generate and set secure JWT_SECRET and SESSION_SECRET
- [ ] Configure SSO provider with production callback URLs
- [ ] Set up PostgreSQL database (or use Redis for development)
- [ ] Configure SSL certificates for HTTPS
- [ ] Test database migrations
- [ ] Create and configure `apps/backend/.env` from `.env.example`

#### 2. Deploy with Docker Compose

```bash
# Configure environment
cp .env.example apps/backend/.env
# Edit apps/backend/.env with your production values

# Build and start services
docker-compose up --build -d

# Check logs
docker-compose logs -f backend

# Verify services are running
docker-compose ps
```

# Check database
docker-compose exec postgres psql -U flowviz_user -d flowviz -c "SELECT COUNT(*) FROM users;"
```

#### 3. SSL/TLS Configuration

Add nginx reverse proxy to `docker-compose.yml`:

```yaml
  nginx:
    image: nginx:alpine
    container_name: flowviz-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
```

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }

    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Backend API
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

#### 4. Database Backups

Create backup script `scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/flowviz_$TIMESTAMP.dump"

docker-compose exec -T postgres pg_dump -U flowviz_user -d flowviz -F c > "$BACKUP_FILE"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "flowviz_*.dump" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/scripts/backup.sh
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Problem:** `Error: connect ECONNREFUSED`

**Solution:**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Verify environment variables
docker-compose exec backend env | grep DATABASE_URL
```

#### 2. SSO Authentication Fails

**Problem:** Redirect loop or authentication error

**Solution:**
- Verify callback URL matches in SSO provider settings
- Check FRONTEND_URL environment variable
- Ensure HTTPS in production
- Verify client ID and secret

```bash
# Test SSO endpoint
curl -I https://yourdomain.com/api/auth/login/google
```

#### 3. Token Expiration Issues

**Problem:** Users getting logged out frequently

**Solution:**
- Increase JWT_ACCESS_EXPIRY in .env
- Verify refresh token logic is working
- Check browser console for 401/403 errors

#### 4. CORS Errors

**Problem:** `Access-Control-Allow-Origin` errors

**Solution:**
Update `src/backend/services/cors.js`:

```javascript
export function applyCors() {
  return cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
}
```

#### 5. Database Migration Issues

**Problem:** Tables not created

**Solution:**
```bash
# Manually run init script
docker-compose exec postgres psql -U flowviz_user -d flowviz -f /docker-entrypoint-initdb.d/init.sql

# Or recreate database
docker-compose down -v
docker-compose up -d
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Application health
curl https://yourdomain.com/health

# Database health
docker-compose exec postgres pg_isready -U flowviz_user

# Check active connections
docker-compose exec postgres psql -U flowviz_user -d flowviz -c "SELECT COUNT(*) FROM pg_stat_activity;"
```

### Performance Monitoring

Install monitoring tools:

```yaml
# Add to docker-compose.yml
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
      
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
```

### Log Management

```bash
# View logs
docker-compose logs -f backend

# Save logs to file
docker-compose logs backend > backend.log

# Rotate logs (add to crontab)
docker-compose logs --tail=1000 backend > /var/log/flowviz/backend_$(date +%Y%m%d).log
```

---

## Support & Resources

### Documentation Links

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Passport.js OAuth Guide](http://www.passportjs.org/packages/passport-oauth2/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)

### SSO Provider Setup Guides

- **Google OAuth:** https://developers.google.com/identity/protocols/oauth2
- **Azure AD:** https://docs.microsoft.com/en-us/azure/active-directory/develop/
- **Okta:** https://developer.okta.com/docs/guides/
- **Auth0:** https://auth0.com/docs/get-started

### Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

---

## License

[Your License Here]

## Contributing

[Your Contributing Guidelines Here]

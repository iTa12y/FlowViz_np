import { createClient, RedisClientType } from 'redis';
import 'dotenv/config';

class RedisService {
  private client: RedisClientType;
  private _isConnecting: boolean;

  constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');
    const redisPassword = process.env.REDIS_PASSWORD || null;

    const redisUrl = redisPassword
      ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
      : `redis://${redisHost}:${redisPort}`;

    this.client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 30000
      }
    });

    this.client.on('error', () => {});
    // Silence noisy connect logs
    this.client.on('connect', () => {});
    
    // Connect immediately (non-blocking) and handle errors
    this.connect().catch(() => {});
    
    // Internal state for retries
    this._isConnecting = false;
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async ensureConnected(maxRetries = 5) {
    if (this.client.isOpen) return true;
    if (this._isConnecting) return false;

    this._isConnecting = true;
    let attempt = 0;
    while (!this.client.isOpen && attempt < maxRetries) {
      try {
        await this.connect();
        this._isConnecting = false;
        return true;
      } catch (err) {
        attempt += 1;
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // 1s,2s,4s,8s,10s
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
    this._isConnecting = false;
    return this.client.isOpen;
  }

  async setValue(key: string, value: any) {
    await this.ensureConnected();
    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }
    return await this.client.set(key, value);
  }

  async getValue(key: string | string[]) {
    await this.ensureConnected();
    if (Array.isArray(key)) {
      const results = [];
      for (const k of key) {
        results.push(await this.client.get(k));
      }
      return results;
    }
    return await this.client.get(key);
  }

  async getJson(key: string) {
    await this.ensureConnected();
    const value = await this.client.get(key);
    if (value) {
      try {
        return JSON.parse(value);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  async deleteValue(key: string) {
    await this.ensureConnected();
    return await this.client.del(key);
  }

  async exists(key: string) {
    await this.ensureConnected();
    const result = await this.client.exists(key);
    return result > 0;
  }

  async setSession(sessionId: string, username: string, ttl = 3600, apiToken: string | null = null, confluenceUrl: string | null = null) {
    await this.ensureConnected();
    // Minimal runtime: avoid verbose console logs

    const multi = this.client.multi();
    multi.setEx(`session:${sessionId}`, ttl, '1');
    multi.setEx(`session:user:${sessionId}`, ttl, username);

    // Store API credentials with session if provided
    if (apiToken && confluenceUrl) {
      const sessionData = {
        username,
        api_token: apiToken,
        confluence_url: confluenceUrl
      };
      const credentialsJson = JSON.stringify(sessionData);
      multi.setEx(`session:credentials:${sessionId}`, ttl, credentialsJson);
    } else {
      // Missing api_token or confluence_url: skip storing credentials
    }

    const results = await multi.exec();
    return results.every((r: any) => r);
  }

  async getSession(sessionId: string) {
    await this.ensureConnected();
    // Avoid verbose logs in production

    try {
      // Try to check what keys exist in Redis (may not have permission)
      const allKeys = await this.client.keys('session:*');
    } catch (e) {
      // Ignore listing errors (permission denied or server policy)
    }

    const sessionFlag = await this.client.get(`session:${sessionId}`);

    if (sessionFlag === '1') {
      const username = await this.client.get(`session:user:${sessionId}`);
      return username;
    } else {
      return null;
    }
  }

  async getSessionCredentials(sessionId: string) {
    await this.ensureConnected();
    const credentialsData = await this.client.get(`session:credentials:${sessionId}`);

    if (credentialsData) {
      try {
        const parsedCredentials = JSON.parse(credentialsData);
        return parsedCredentials;
      } catch (e) {
        return null;
      }
    } else {
      return null;
    }
  }

  async getSessionUsername(sessionId: string) {
    await this.ensureConnected();
    return await this.getSession(sessionId);
  }

  async deleteSession(sessionId: string) {
    await this.ensureConnected();
    const multi = this.client.multi();
    multi.del(`session:${sessionId}`);
    multi.del(`session:user:${sessionId}`);
    multi.del(`session:credentials:${sessionId}`);
    const results = await multi.exec();
    return results.reduce((sum: number, r: any) => sum + (r || 0), 0);
  }

  // Flow storage methods
  async getUserFlows(username: string) {
    const flowsKey = `user:flows:${username}`;
    const value = await this.client.get(flowsKey);

    if (!value) {
      return [];
    }

    try {
      const flows = JSON.parse(value);
      // Ensure flows is a list
      if (!Array.isArray(flows)) {
        return [];
      }
      // Ensure each item is a dict (handle double-encoded data)
      const parsedFlows = [];
      for (const flow of flows) {
        if (typeof flow === 'string') {
          // Double-encoded, parse it
          try {
            parsedFlows.push(JSON.parse(flow));
          } catch (e) {
            // Skip invalid flows
          }
        } else if (typeof flow === 'object') {
          parsedFlows.push(flow);
        }
      }
      return parsedFlows;
    } catch (e) {
      return [];
    }
  }

  async saveUserFlow(username: string, flowData: any) {
    const flowsKey = `user:flows:${username}`;
    const flows = await this.getUserFlows(username);

    // Check if flow exists (by id)
    const flowId = flowData.id;
    if (flowId) {
      // Update existing flow - remove old version
      const filteredFlows = flows.filter(f => f.id !== flowId);
      filteredFlows.push(flowData);
      return await this.setValue(flowsKey, filteredFlows);
    }

    flows.push(flowData);
    return await this.setValue(flowsKey, flows);
  }

  async deleteUserFlow(username: string, flowId: string) {
    const flowsKey = `user:flows:${username}`;
    const flows = await this.getUserFlows(username);

    // Filter out the flow to delete
    const updatedFlows = flows.filter(f => f.id !== flowId);

    if (updatedFlows.length === flows.length) {
      return false; // Flow not found
    }

    return await this.setValue(flowsKey, updatedFlows);
  }
}

export default RedisService;

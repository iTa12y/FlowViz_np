// API-based storage service for incident flows
// Stores flows in Redis via backend API (per-user, server-side storage)

import { withApiBase } from '@/utils';

// Generate unique ID
function generateId() {
  return `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// API helper with credentials included
async function apiRequest(endpoint, options: { headers?: Record<string, string> } & RequestInit = {}) {
  const fullUrl = withApiBase(endpoint);
  
  const response = await fetch(fullUrl, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    console.error('apiStorage - Error response:', error);
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// IncidentFlow storage operations (server-side)
export const IncidentFlowStorage = {
  // Backwards-compatible alias
  async getAll() {
    return this.list();
  },
  // List all flows for authenticated user
  async list(sortField = '-created_date', limit = null) {
    const data = await apiRequest('/api/flows');
    let flows = data.flows || [];
    
    // Sort
    if (sortField) {
      const isDescending = sortField.startsWith('-');
      const field = isDescending ? sortField.substring(1) : sortField;
      
      flows.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal < bVal) return isDescending ? 1 : -1;
        if (aVal > bVal) return isDescending ? -1 : 1;
        return 0;
      });
    }
    
    // Limit
    if (limit && limit > 0) {
      flows = flows.slice(0, limit);
    }
    
    return flows;
  },

  // Filter flows
  async filter(query) {
    const flows = await this.list();
    
    if (!query || Object.keys(query).length === 0) {
      return flows;
    }
    
    return flows.filter(flow => {
      return Object.entries(query).every(([key, value]) => {
        return flow[key] === value;
      });
    });
  },

  // Create a new flow
  async create(data) {
    const newFlow = {
      id: generateId(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      ...data
    };
    
    await apiRequest('/api/flows', {
      method: 'POST',
      body: JSON.stringify(newFlow),
    });
    
    return newFlow;
  },

  // Update a flow
  async update(id, data) {
    const flows = await this.list();
    const existingFlow = flows.find(f => f.id === id);
    
    if (!existingFlow) {
      throw new Error('Flow not found');
    }
    
    const updatedFlow = {
      ...existingFlow,
      ...data,
      updated_date: new Date().toISOString()
    };
    
    await apiRequest('/api/flows', {
      method: 'POST',
      body: JSON.stringify(updatedFlow),
    });
    
    return updatedFlow;
  },

  // Delete a flow
  async delete(id) {
    await apiRequest(`/api/flows/${id}`, {
      method: 'DELETE',
    });
    
    return true;
  },

  // Get a single flow by ID
  async getById(id) {
    const flows = await this.list();
    const flow = flows.find(f => f.id === id);
    
    if (!flow) {
      throw new Error('Flow not found');
    }
    
    return flow;
  }
};

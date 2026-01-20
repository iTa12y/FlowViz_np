// Local storage service for incident flows
// This replaces Base44's database for standalone deployment

const STORAGE_KEY = 'incident_flows';

// Generate unique ID
function generateId() {
  return `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get all flows from localStorage
function getAllFlows() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading from localStorage:', err);
    return [];
  }
}

// Save flows to localStorage
function saveFlows(flows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flows));
  } catch (err) {
    console.error('Error saving to localStorage:', err);
    throw new Error('Failed to save data');
  }
}

// IncidentFlow storage operations
export const IncidentFlowStorage = {
  // List all flows with optional sorting
  list(sortField = '-created_date', limit = null) {
    let flows = getAllFlows();
    
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
  filter(query) {
    const flows = getAllFlows();
    
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
  create(data) {
    const flows = getAllFlows();
    
    const newFlow = {
      id: generateId(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      ...data
    };
    
    flows.push(newFlow);
    saveFlows(flows);
    
    return newFlow;
  },

  // Update a flow
  update(id, data) {
    const flows = getAllFlows();
    const index = flows.findIndex(f => f.id === id);
    
    if (index === -1) {
      throw new Error('Flow not found');
    }
    
    flows[index] = {
      ...flows[index],
      ...data,
      updated_date: new Date().toISOString()
    };
    
    saveFlows(flows);
    return flows[index];
  },

  // Delete a flow
  delete(id) {
    const flows = getAllFlows();
    const filteredFlows = flows.filter(f => f.id !== id);
    
    if (flows.length === filteredFlows.length) {
      throw new Error('Flow not found');
    }
    
    saveFlows(filteredFlows);
    return true;
  },

  // Get a single flow by ID
  getById(id) {
    const flows = getAllFlows();
    return flows.find(f => f.id === id);
  }
};
import axios from 'axios';

export class ConfluenceService {
  constructor(username, apiKey, baseUrl) {
    this.username = username;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.auth = Buffer.from(`${username}:${apiKey}`).toString('base64');
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/rest/api/user/current`, {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Accept': 'application/json'
        }
      });
      return { success: true, user: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  async getPage(pageId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/rest/api/content/${pageId}?expand=body.storage,version`,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Accept': 'application/json'
          }
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  async searchPages(cql) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/rest/api/content/search`,
        {
          params: { cql },
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Accept': 'application/json'
          }
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }
}

import axios from 'axios';

export class ConfluenceService {
  username: string;
  apiKey: string;
  baseUrl: string;
  auth: string;
  confluenceUrl: string;

  constructor(username: string, apiKey: string, baseUrl: string) {
    this.username = username;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.confluenceUrl = baseUrl;
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
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  async getPage(pageId: string) {
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
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  async searchPages(cql: string) {
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
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }
}

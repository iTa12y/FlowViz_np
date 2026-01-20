# FlowViz - Confluence Integration & Redis Service

## Overview

This update adds Atlassian Confluence authentication and fixes the Redis service for secure credential storage.

## Changes Made

### 1. Fixed Redis Service (`src/backend/api/redis_service.py`)
- ✅ Removed SSL requirement for localhost connections
- ✅ Fixed duplicate `get_value` method definition
- ✅ Added proper type hints and documentation
- ✅ Added JSON serialization/deserialization helpers
- ✅ Added Confluence authentication storage methods
- ✅ Improved error handling with proper return types

**Key Methods:**
- `set_value(key, value)` - Store any value (auto-serializes dicts/lists)
- `get_value(key)` - Retrieve value (supports single key or list of keys)
- `get_json(key)` - Retrieve and parse JSON values
- `set_confluence_auth(username, api_key)` - Store Confluence credentials
- `get_confluence_auth()` - Retrieve Confluence credentials

### 2. Confluence Service (`src/backend/services/confluence.js`)
New service for interacting with Atlassian Confluence API:
- Basic authentication with username + API token
- Connection testing
- Page retrieval
- Content search with CQL

### 3. Confluence Controller (`src/backend/controllers/confluence.js`)
Handles Confluence authentication and integration:
- `POST /api/confluence/auth` - Set and validate Confluence credentials
- `GET /api/confluence/auth` - Check authentication status
- `POST /api/confluence/test` - Test connection

### 4. Frontend Components

#### ConfluenceSetup Component (`src/frontend/Components/setup/ConfluenceSetup.jsx`)
User interface for configuring Confluence authentication:
- Form for entering username, API token, and base URL
- Connection validation before saving
- Status indicator when configured
- Integration with backend API

#### Updated CreateFlow Page
- Added OpenAISetup and ConfluenceSetup components to sidebar
- Better organized setup configuration
- Visual indicators for service status

### 5. Backend Integration
- Added confluence router to Express server
- Updated environment configuration for Redis and Confluence settings
- Added axios dependency for HTTP requests

## Setup Instructions

### 1. Install Dependencies

Backend:
```bash
cd src/backend
npm install
```

Python (Redis service):
```bash
pip install redis python-dotenv
```

### 2. Start Redis (Required)

**Windows:**
```powershell
# Install Redis using Chocolatey
choco install redis-64

# Or download from: https://github.com/microsoftarchive/redis/releases

# Start Redis
redis-server
```

**Linux/macOS:**
```bash
# Install Redis
sudo apt-get install redis-server  # Ubuntu/Debian
brew install redis                  # macOS

# Start Redis
redis-server
```

### 3. Environment Variables

Create or update `.env` in the project root:

```env
# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_API_KEY=sk-your-openai-key-here

# Redis Configuration (optional, defaults shown)
REDIS_HOST=localhost
REDIS_PORT=6379

# Confluence Configuration (optional)
CONFLUENCE_BASE_URL=https://yourcompany.atlassian.net/wiki
```

### 4. Get Confluence API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a label (e.g., "FlowViz Integration")
4. Copy the token (you won't see it again!)
5. Use your Atlassian account email as the username

### 5. Start the Application

Backend:
```bash
cd src/backend
npm run dev
```

Frontend:
```bash
npm run dev
```

## Usage

### Configuring Confluence in the App

1. Navigate to the "Create Flow" page
2. Look for the **Confluence Integration** panel in the sidebar
3. Click "Configure Confluence"
4. Enter:
   - **Username**: Your Atlassian account email
   - **API Token**: The token you generated
   - **Base URL**: Your Confluence instance URL (e.g., `https://yourcompany.atlassian.net/wiki`)
5. Click "Save & Test Connection"
6. If successful, you'll see a green "Confluence Configured" status

### Using Confluence Pages

Once configured, you can:
1. Select the "Confluence Page" tab on the Create Flow page
2. Enter the exact name of a Confluence page containing incident documentation
3. The system will fetch and analyze the content automatically

## API Endpoints

### Confluence Authentication

**Set Authentication**
```http
POST /api/confluence/auth
Content-Type: application/json

{
  "username": "user@example.com",
  "apiKey": "your-api-token",
  "baseUrl": "https://yourcompany.atlassian.net/wiki"
}
```

**Get Authentication Status**
```http
GET /api/confluence/auth

Response:
{
  "configured": true,
  "username": "user@example.com"
}
```

**Test Connection**
```http
POST /api/confluence/test
Content-Type: application/json

{
  "baseUrl": "https://yourcompany.atlassian.net/wiki"
}
```

## Troubleshooting

### Redis Connection Issues

**Error: `Connection refused`**
- Ensure Redis is running: `redis-cli ping` (should respond with `PONG`)
- Check if Redis is on the correct port: `redis-cli -p 6379 ping`

**Error: `SSL/TLS error`**
- The code has been updated to remove SSL for localhost
- Restart the backend server after the update

### Confluence Authentication Issues

**Error: `Invalid Confluence credentials`**
- Verify your API token hasn't expired
- Ensure you're using your full email address as the username
- Check that the base URL is correct (should not include `/rest/api`)

**Error: `Connection test failed`**
- Verify your network can access Confluence
- Check for firewall or proxy restrictions
- Ensure the base URL format is correct

### Python Issues

**Error: `python: command not found`**
- Ensure Python 3 is installed: `python --version` or `python3 --version`
- On some systems, use `python3` instead of `python`

**Error: `ModuleNotFoundError: No module named 'redis'`**
- Install dependencies: `pip install redis python-dotenv`
- Or use: `pip3 install redis python-dotenv`

## Security Notes

⚠️ **Important Security Considerations:**

1. **API Tokens**: Never commit API tokens to version control
2. **Environment Variables**: Keep `.env` file in `.gitignore`
3. **Redis Security**: In production, use Redis authentication and encryption
4. **Confluence Credentials**: Stored in Redis (consider encryption for production)
5. **Production Setup**: Use a backend proxy instead of exposing credentials in the frontend

## Next Steps

Consider implementing:
- [ ] Encrypted storage for Confluence credentials
- [ ] Redis authentication for production
- [ ] Confluence page content caching
- [ ] Support for Confluence spaces and folders
- [ ] Automatic incident report detection
- [ ] Multi-page incident analysis

## Support

For issues or questions:
1. Check that all dependencies are installed
2. Verify Redis is running
3. Check console logs for detailed error messages
4. Ensure environment variables are set correctly

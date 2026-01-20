# FlowViz - Session-Based Authentication

## Overview

FlowViz now uses **Confluence credentials as the authentication mechanism**. Users must authenticate with their Atlassian Confluence credentials to access the application.

## How It Works

1. **Login**: User provides Confluence credentials (username, API key, base URL)
2. **Verification**: Backend verifies credentials with Confluence API (credentials are NOT stored)
3. **Session Creation**: On successful verification, a 1-hour session is created in Redis
4. **Session Storage**: Session stored as key-value pairs:
   - `session:{sessionId}` → `1` (valid) or `0` (invalid)
   - `session:user:{sessionId}` → `username`
5. **Protected Access**: All app routes require valid session

## Key Features

✅ **No credential storage** - API keys are verified but never saved  
✅ **1-hour sessions** - Automatic expiration after 3600 seconds  
✅ **Redis-based** - Fast, scalable session management  
✅ **Cookie authentication** - Secure HttpOnly cookies  
✅ **Auto-redirect** - Expired sessions redirect to login

## Setup

### 1. Start Redis

```powershell
redis-server
```

### 2. Install Dependencies

```bash
# Backend
cd apps/backend
npm install

# Python (if not already installed)
pip install redis python-dotenv
```

### 3. Start the Application

```bash
# Backend (in apps/backend directory)
npm run dev

# Frontend (in project root)
npm run dev
```

### 4. Login

1. Navigate to `http://localhost:5173`
2. You'll be redirected to `/login`
3. Enter your Confluence credentials:
   - **Username**: Your Atlassian account email
   - **API Token**: Generated from [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
   - **Base URL**: Your Confluence instance URL (e.g., `https://yourcompany.atlassian.net/wiki`)
4. Click "Login" - credentials are verified but not stored
5. On success, you'll be redirected to the home page with a 1-hour session

## API Endpoints

### Authentication

**POST /api/auth/login**
```json
{
  "username": "user@example.com",
  "apiKey": "your-api-token",
  "baseUrl": "https://yourcompany.atlassian.net/wiki"
}
```
Response:
```json
{
  "success": true,
  "message": "Login successful",
  "username": "user@example.com",
  "expiresIn": 3600
}
```

**GET /api/auth/verify**
```
Returns session status
```
Response:
```json
{
  "valid": 1,
  "username": "user@example.com"
}
```

**POST /api/auth/logout**
```
Destroys session
```
Response:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Redis Session Structure

### Session Keys

```
session:abc123def456...  →  "1"  (session valid)
session:user:abc123def456...  →  "user@example.com"
```

### Session Values

- `1` = Valid session
- `0` = Invalid/expired session (or key doesn't exist)

### TTL (Time To Live)

All session keys automatically expire after **3600 seconds (1 hour)**.

## Frontend Components

### Login Page
- `apps/frontend/Pages/Login.jsx`
- Form for Confluence credentials
- Verification and error handling
- Redirects to home on success

### ProtectedRoute
- `apps/frontend/Components/ProtectedRoute.jsx`
- Checks session validity before rendering
- Redirects to `/login` if session invalid
- Shows loading state during verification

### Layout with Logout
- `apps/frontend/Layout.jsx`
- Displays current username
- Logout button (destroys session)
- Available on all protected pages

## Backend Components

### Confluence Controller
- `apps/backend/controllers/confluence.js`
- `login()` - Verifies credentials and creates session
- `verifySession()` - Checks if session is valid
- `logout()` - Destroys session

### Redis Service
- `apps/redis/services/redis_service.py`
- `set_session(session_id, username, ttl)` - Create session
- `get_session(session_id)` - Check session validity (returns 0 or 1)
- `get_session_username(session_id)` - Get username for session
- `delete_session(session_id)` - Remove session

## Security Notes

🔒 **Important Security Features:**

1. **No Credential Storage**: API keys are verified once during login, never stored
2. **HttpOnly Cookies**: Session cookies can't be accessed by JavaScript
3. **Automatic Expiration**: Sessions expire after 1 hour
4. **Secure in Production**: Cookies use `secure` flag in production (HTTPS only)
5. **CORS Protection**: Backend only accepts requests from allowed origins

## Session Lifecycle

```
Login → Verify Credentials → Create Session (1hr) → Set Cookie → Access App
   ↓                                                                ↓
Logout → Delete Session → Clear Cookie → Redirect to Login
   ↓                                                                ↓
Expired → Auto-Delete (TTL) → 401 Error → Redirect to Login
```

## Troubleshooting

### "No session found" error
- Session expired (1 hour limit)
- Cookie was cleared
- **Solution**: Log in again

### "Invalid Confluence credentials" error
- Wrong username or API token
- Incorrect base URL format
- Network connectivity issues
- **Solution**: Verify credentials and try again

### Redis connection failed
- Redis server not running
- **Solution**: Start Redis with `redis-server`

### Session not persisting
- Cookies blocked by browser
- Different port/domain (CORS issue)
- **Solution**: Check browser settings, verify CORS configuration

## Testing

### Test Redis Sessions Directly

```bash
python apps/redis/services/redis_service.py
```

Expected output:
```
Retrieved values: ['Bar', 'hatih']
Session valid: 1
Session user: user@example.com
Session after logout: 0
```

### Test Login Flow

1. Visit `http://localhost:5173/login`
2. Enter valid Confluence credentials
3. Should redirect to home page
4. Username should appear in top right
5. Logout button should work

### Test Session Expiration

1. Login successfully
2. Wait 1 hour (or modify TTL in code for testing)
3. Try to access protected page
4. Should redirect to login

## Configuration

### Change Session Duration

Edit `apps/backend/controllers/confluence.js`:

```javascript
await callPythonRedis('set_session', sessionId, username, 1800); // 30 minutes
```

Edit `apps/redis/services/redis_service.py`:

```python
def set_session(self, session_id: str, username: str, ttl: int = 1800):
    # TTL in seconds
```

### Production Setup

1. Set `NODE_ENV=production`
2. Use HTTPS
3. Configure Redis with authentication
4. Use secure, HTTP-only cookies
5. Set up proper CORS origins

## Migration Notes

If upgrading from the old system:
- Old `ConfluenceSetup` component removed
- Credentials no longer stored in Redis
- Users must login on each session
- 1-hour session limit enforced
- `/login` route now required

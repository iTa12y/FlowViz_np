# Security Improvements Summary

## Overview
Restructured authentication and storage to eliminate credential exposure and enable multi-location access with server-side storage.

## Key Changes

### 1. **HTTP-Only Cookie Authentication**
- **Before**: Session ID stored in browser localStorage (vulnerable to XSS attacks)
- **After**: Session ID stored in HTTP-only cookies (inaccessible to JavaScript)
- **Security**: Protects against XSS attacks, CSRF protection with SameSite=Lax

**Backend (Python API):**
- Login sets HTTP-only cookie with secure flag in production
- All endpoints read session from cookie, not headers
- Logout clears cookie properly

**Frontend:**
- Removed all `localStorage.getItem('session_id')` calls
- Added `credentials: 'include'` to all fetch requests
- Session management now handled automatically by browser

### 2. **Server-Side Flow Storage (Redis)**
- **Before**: Flows stored in browser localStorage (lost when switching devices)
- **After**: Flows stored in Redis per-user (accessible from any location)

**New Endpoints:**
- `GET /api/flows` - Get all flows for authenticated user
- `POST /api/flows` - Save/update a flow
- `DELETE /api/flows/{flow_id}` - Delete a specific flow

**Frontend:**
- Created `apiStorage.jsx` service replacing `localStorage.jsx`
- All pages (CreateFlow, FlowEditor, History) now use API storage
- React Query handles async operations seamlessly

### 3. **Credential Security**
- **Before**: Admin credentials in `.env`, potentially passed from frontend
- **After**: 
  - No admin credentials required - each user authenticates with their own
  - Credentials only sent during login, stored server-side in Redis
  - All subsequent API calls use session cookie
  - User's Confluence credentials retrieved from Redis for API operations

**Updated Services:**
- `ConfluenceService` - Creates client per-user with stored credentials
- `RedisService` - Added user-specific flow storage methods
- Credentials stored plaintext in Redis (secure Redis with password/TLS in production)

### 4. **CORS & Cookie Configuration**
```python
# Production settings
CORS(app, 
     origins=allowed_origins,
     supports_credentials=True)  # Allow cookies

response.set_cookie(
    'session_id',
    session_id,
    httponly=True,
    secure=True,  # HTTPS only in production
    samesite='Lax',
    max_age=3600
)
```

## Files Modified

### Backend (Python API)
- `apps/api/.env` - Removed admin credentials
- `apps/api/app.py` - Added flow endpoints, cookie auth
- `apps/api/services/confluence_service.py` - Per-user client creation
- `apps/api/services/redis_service.py` - Flow storage methods

### Backend (Node.js)
- `apps/backend/middleware/auth.js` - Cookie authentication

### Frontend
- `apps/frontend/Components/services/apiStorage.jsx` - **NEW** API storage service
- `apps/frontend/Pages/Login.jsx` - Removed session_id from localStorage
- `apps/frontend/Layout.jsx` - Cookie-based logout
- `apps/frontend/Components/ProtectedRoute.jsx` - Cookie-based auth check
- `apps/frontend/Pages/CreateFlow.jsx` - Use API storage
- `apps/frontend/Pages/FlowEditor.jsx` - Use API storage
- `apps/frontend/Pages/History.jsx` - Use API storage

## Security Checklist

✅ Session cookies are HTTP-only (not accessible to JavaScript)
✅ Secure flag enabled in production (HTTPS only)
✅ SameSite=Lax prevents CSRF attacks
✅ Credentials only sent during login
✅ No credentials stored in browser
✅ Per-user server-side storage
✅ Session expiration (1 hour)
✅ Proper logout clears cookies

## Production Recommendations

1. **Enable HTTPS**: Set `FLASK_ENV=production` to enforce secure cookies
2. **Secure Redis**: Add password authentication (`REDIS_PASSWORD`)
3. **Use Redis TLS**: Encrypt Redis connections in production
4. **Short Session TTL**: Consider 15-30 minute sessions with refresh tokens
5. **Rate Limiting**: Already implemented (5 login attempts/minute)
6. **Redis Persistence**: Configure RDB/AOF for data durability

## Testing

To verify the changes work:
1. Login at http://localhost:5173/login
2. Check browser DevTools > Application > Cookies (should see `session_id`)
3. Create a flow - saved to Redis
4. Logout and login again - flows persist
5. Try accessing from different browser/device (same account, same flows)

## Breaking Changes

⚠️ **Important**: Users will need to login again (old localStorage sessions invalid)
⚠️ **Data Migration**: Existing flows in localStorage need manual export/import

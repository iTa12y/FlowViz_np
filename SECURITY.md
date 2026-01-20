# Security Best Practices

## ⚠️ IMPORTANT: Production Deployment Security

### HTTPS Requirement

**NEVER deploy this application without HTTPS in production.** The login flow requires sending Confluence credentials, which must be encrypted in transit.

### Current Security Measures

1. **Session-Based Authentication**
   - API tokens are sent ONCE during login
   - Tokens are immediately hashed with bcrypt and stored in Redis
   - Subsequent requests use session ID only (X-Session-ID header)
   - Sessions expire after 1 hour

2. **Credential Storage**
   - API tokens are hashed with bcrypt before storage
   - Tokens are truncated to 72 bytes (bcrypt limit)
   - Credentials stored in Redis, never in localStorage
   - Frontend clears credentials from memory after login

3. **Security Headers** (Python API)
   - `Cache-Control: no-store` - Prevents credential caching
   - `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
   - `X-Frame-Options: DENY` - Prevents clickjacking
   - `X-XSS-Protection` - XSS protection

4. **CORS Protection**
   - Strict origin validation
   - Credentials require explicit origin match
   - No wildcard origins allowed

5. **Rate Limiting**
   - Login: 5 requests/minute
   - Auth verify: 50 requests/minute
   - Confluence API: 30 requests/minute

### Production Deployment Checklist

- [ ] **Enable HTTPS** - Use valid SSL/TLS certificate
- [ ] **Uncomment HSTS header** in app.py line 19
- [ ] **Set secure environment variables**:
  ```bash
  CORS_ORIGINS=https://your-domain.com
  FLASK_DEBUG=False
  ```
- [ ] **Use secure Redis connection** - Enable TLS for Redis
- [ ] **Enable Redis password** - Set REDIS_PASSWORD in .env
- [ ] **Update API URLs** in frontend .env:
  ```
  VITE_AUTH_API_URL=https://api.your-domain.com
  VITE_API_URL=https://api.your-domain.com
  ```
- [ ] **Configure firewall rules** - Restrict API access
- [ ] **Enable logging** - Monitor authentication attempts
- [ ] **Set up monitoring** - Track failed login attempts

### Why You See Credentials in Network Tab

**This is expected behavior for the initial login request:**

1. User enters credentials in the browser
2. Frontend sends ONE POST request to `/api/auth/login` with credentials
3. Server validates, hashes, and stores credentials in Redis
4. Server returns session ID (not the API token)
5. All subsequent requests use session ID only

**The API token is visible in the network tab during login because:**
- It must be transmitted from browser to server
- This is standard authentication flow (same as any login form)
- **HTTPS encrypts this in production** so it's not readable in transit
- The token is immediately cleared from browser memory

### What Makes This Secure

✅ **Credentials sent only once** - During login only  
✅ **HTTPS encrypts transmission** - In production  
✅ **Bcrypt hashing** - Credentials stored hashed, not plain text  
✅ **Session tokens** - Short-lived, separate from API token  
✅ **No client-side storage** - API token never stored in localStorage  
✅ **Security headers** - Prevent common attacks  
✅ **Rate limiting** - Prevents brute force attacks  

### Alternative Architecture (More Secure)

For maximum security, consider:

1. **Backend-only credentials** - Store Confluence credentials only on server
2. **OAuth flow** - Use Atlassian OAuth instead of API tokens
3. **API Gateway** - Add authentication proxy layer
4. **VPN/Internal network** - Restrict access to internal network only

### Security Incident Response

If credentials are compromised:

1. **Revoke Confluence API token** at Atlassian account settings
2. **Clear Redis sessions**: `redis-cli FLUSHDB`
3. **Rotate Redis password**
4. **Generate new session secrets**
5. **Review access logs** for suspicious activity

### Questions?

The current implementation follows industry-standard patterns for credential-based authentication. The key is **HTTPS in production** - without it, credentials can be intercepted. With HTTPS, this is as secure as any major website's login flow (Gmail, GitHub, etc.).

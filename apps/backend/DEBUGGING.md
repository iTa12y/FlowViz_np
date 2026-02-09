# Backend Debugging Guide

## HTTP Request/Response Debugging

The backend now uses the `debug` module for structured logging instead of console.log statements.

### Enabling HTTP Debugging

To enable HTTP request/response debugging, set the `DEBUG` environment variable:

#### Development (Windows PowerShell)
```powershell
$env:DEBUG="flowviz:http"
pnpm run dev:backend
```

#### Development (Unix/Linux/Mac)
```bash
DEBUG=flowviz:http pnpm run dev:backend
```

#### Enable All FlowViz Debugging
```powershell
# Windows
$env:DEBUG="flowviz:*"

# Unix/Linux/Mac
DEBUG=flowviz:* pnpm run dev:backend
```

### Debug Namespaces

- `flowviz:server` - Server startup and configuration
- `flowviz:http` - HTTP requests and responses (includes timing, status codes, and error details)
- `flowviz:*` - All FlowViz debug logs

### What Gets Logged

When `flowviz:http` is enabled, you'll see:

- Incoming HTTP requests with method and URL
- Query parameters (if present)
- Request body (with sensitive fields like passwords/tokens redacted)
- Response status codes and timing
- Error responses (truncated to 200 chars)

### Example Output

```
flowviz:http GET /api/flows +0ms
flowviz:http   Query: { limit: '10' } +1ms
flowviz:http GET /api/flows - 200 (45ms) +46ms
```

### Production

In production, disable debugging by not setting the DEBUG environment variable, or set it to an empty string:

```bash
DEBUG= node server.js
```

## Benefits

- **No console clutter**: Only see logs when you need them
- **Performance**: Zero overhead when debugging is disabled
- **Structured**: Consistent format across all logs
- **Secure**: Sensitive data automatically redacted from logs
- **Granular control**: Enable only the logs you need

## Development Tips

1. During active development, use `DEBUG=flowviz:*` to see everything
2. When debugging specific HTTP issues, use `DEBUG=flowviz:http`
3. In production, keep DEBUG unset or empty for best performance

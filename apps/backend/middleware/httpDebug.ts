import createDebug from 'debug';
import type { Request, Response, NextFunction } from 'express';

const httpDebug = createDebug('flowviz:http');

interface RequestWithStartTime extends Request {
  _startTime?: number;
}

/**
 * HTTP request/response debugging middleware
 * Enable with: DEBUG=flowviz:http or DEBUG=flowviz:*
 */
export const httpDebugMiddleware = (req: RequestWithStartTime, res: Response, next: NextFunction) => {
  if (!httpDebug.enabled) {
    return next();
  }

  const startTime = Date.now();
  req._startTime = startTime;

  // Log incoming request
  httpDebug('%s %s', req.method, req.url);
  
  if (Object.keys(req.query).length > 0) {
    httpDebug('  Query: %O', req.query);
  }
  
  if (req.body && Object.keys(req.body).length > 0) {
    // Sanitize sensitive data from logs
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    if (sanitizedBody.apiKey) sanitizedBody.apiKey = '[REDACTED]';
    if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
    
    httpDebug('  Body: %O', sanitizedBody);
  }

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    httpDebug('%s %s - %d (%dms)', req.method, req.url, res.statusCode, duration);
    
    if (res.statusCode >= 400) {
      httpDebug('  Error Response: %s', typeof data === 'string' ? data : JSON.stringify(data).substring(0, 200));
    }
    
    return originalSend.call(this, data);
  };

  next();
};

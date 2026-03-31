import 'dotenv/config';
import createDebug from 'debug';
import express from "express";
import env from "./services/env.js";

const debug = createDebug('flowviz:server');

import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import incidentRouter from "./router/incident.js"
import authRouter from "./router/auth.js"
import confluenceRouter from "./router/confluence.js"
import flowsRouter from "./router/flows.js"
import { applyCors } from "./services/cors.js";
import { httpDebugMiddleware } from "./middleware/httpDebug.js";

const app = express();

// HTTP debugging middleware (enable with DEBUG=flowviz:http or DEBUG=flowviz:*)
app.use(httpDebugMiddleware);

// Security headers middleware
app.use((req: any, res: any, next: any) => {
  // Skip cache control for OPTIONS requests
  if (req.method !== 'OPTIONS') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Uncomment in production with HTTPS:
  // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use(applyCors())
// Note: explicit app.options() is not needed — applyCors() uses preflightContinue: false,
// so the cors middleware already intercepts and terminates OPTIONS requests via app.use().
app.use(cookieParser());
app.use(express.json({ limit: env.REQUEST_BODY_SIZE_LIMIT }));
app.set("trust proxy", 1);

app.use("/api", rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: any) => req.method === 'OPTIONS' // Skip rate limiting for CORS preflight
}));

app.use("/api/auth", authRouter)
app.use("/api/confluence", confluenceRouter)
app.use("/api/flows", flowsRouter)
app.use("/api/incident", incidentRouter)

app.get("/health", (req: any, res: any) => {
  res.json({ status: "ok", service: "flowviz-backend" });
});

const PORT = env.PORT;
app.listen(PORT, () => {
  debug('Backend server listening on port %d', PORT);
  debug('Resolved CORS origins: %o', env.CORS_ORIGINS);
  debug('Resolved frontend URL: %s', env.FRONTEND_URL);
  debug('HTTP debugging: Set DEBUG=flowviz:http for request/response logs');
  debug('All debugging: Set DEBUG=flowviz:* for comprehensive logs');
});
import 'dotenv/config';
import express from "express";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import incidentRouter from "./router/incident.js"
import authRouter from "./router/auth.js"
import confluenceRouter from "./router/confluence.js"
import flowsRouter from "./router/flows.js"
import { applyCors } from "./services/cors.js";

const app = express();

// Security headers middleware
app.use((req, res, next) => {
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
app.use(cookieParser());
app.use(express.json({ limit: "50kb" }));
app.set("trust proxy", 1);

app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' // Skip rate limiting for CORS preflight
}));

app.use("/api/auth", authRouter)
app.use("/api/confluence", confluenceRouter)
app.use("/api/flows", flowsRouter)
app.use("/api", incidentRouter)

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "flowviz-backend" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Backend running on port ${PORT}`)
);
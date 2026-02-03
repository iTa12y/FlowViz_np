import 'dotenv/config';
import express from "express";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
// import incidentRouter from "./router/incident.js"
import authRouter from "./router/auth.js"
import confluenceRouter from "./router/confluence.js"
import flowsRouter from "./router/flows.js"
import { applyCors } from "./services/cors.js";

console.log('Auth and flows routers imported successfully');

const app = express();

app.use(applyCors())
app.use(cookieParser());
app.use(express.json({ limit: "50kb" }));
app.set("trust proxy", 1);

app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use("/api/auth", authRouter)
app.use("/api/confluence", confluenceRouter)

// Debug the flows router before mounting
console.log('About to mount flows router:', typeof flowsRouter);
console.log('Flows router stack:', flowsRouter.stack ? flowsRouter.stack.length : 'No stack');

app.use("/api/flows", flowsRouter)
// app.use("/api/incident", incidentRouter)  // Changed from /api to /api/incident

console.log('All routes registered:');
console.log('- /api/auth');
console.log('- /api/confluence'); 
console.log('- /api/flows');
// console.log('- /api/incident');

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(3001, () =>
  console.log("Backend running on port 3001")
);
import 'dotenv/config';
import express from "express";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import incidentRouter from "./router/incident.js"
import { applyCors } from "./services/cors.js";

const app = express();

app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(applyCors())
app.use(cookieParser());
app.use(express.json({ limit: "50kb" }));
app.set("trust proxy", 1);

app.use("/api", incidentRouter)

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(3001, () =>
  console.log("Backend running on port 3001")
);
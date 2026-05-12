import express from "express";
import "dotenv/config";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import path from "path";
import { readdirSync } from "fs";
// import dbConnect from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import { globalLimiter } from "./middlewares/rateLimiters.js";
import { globalErrorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import http from "http";

// ─── Socket.io (driver matching realtime) ─────────────────────────────────────
import { initSocket } from "./socket/index.js";

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with the HTTP server
initSocket(server); 

const port = Number(process.env.PORT) || 5000;

const envOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const allowedOrigins = [
  // Add production URLs
  process.env.ADMIN_URL,
  process.env.VEHICLE_OWNERS_URL,
  ...envOrigins,
  // Add localhost for development
  "http://localhost:3000", // React development server
  "http://localhost:5173", // Vite default dev server
  "http://localhost:5174", // Current admin dev server
  "http://localhost:8081", // iOS simulator
  "http://10.0.2.2:8081", // Android emulator
  "http://10.0.2.2:8000", // Android emulator direct access
  "http://0.0.0.0:8000", // Android emulator alternative
  "http://10.0.3.2:8000" // Genymotion emulator
].filter(Boolean); // Remove any undefined values

const allowedOriginSet = new Set(allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOriginSet.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "token", "Idempotency-Key", "idempotency-key", "X-Request-ID", "x-request-id"],
  })
);
app.use(helmet());
app.use(globalLimiter);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to databases and external services
connectCloudinary();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesPath = path.resolve(__dirname, "./routes");
const routeFiles = readdirSync(routesPath, { withFileTypes: true })
  .filter((entry) => entry.isFile() && [".js", ".mjs"].includes(path.extname(entry.name)))
  .map((entry) => entry.name);

for (const file of routeFiles) {
  const routeModule = await import(`./routes/${file}`);
  app.use("/", routeModule.default);
}

app.get("/", (req, res) => {
  res.send("You should not be here!");
});


app.use(notFoundHandler);
app.use(globalErrorHandler);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

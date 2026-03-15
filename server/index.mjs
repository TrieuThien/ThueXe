import express from "express";
import "dotenv/config";
import cors from "cors";
import helmet from "helmet";
import { fileURLToPath } from "url";
import path from "path";
import { readdirSync } from "fs";
// import dbConnect from "./config/mongodb.js";
import sqldb from "./config/sqldatabase.js";
import connectCloudinary from "./config/cloudinary.js";
import { globalLimiter } from "./middlewares/rateLimiters.js";
import { globalErrorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
// import http from "http";



const app = express();
// const server = http.createServer(app);
// initSocket(server);

const port = Number(process.env.PORT) || 5000;

const allowedOrigins = [
  // Add production URLs
  process.env.ADMIN_URL,
  // Add localhost for development
  "http://localhost:3000", // React development server
  "http://localhost:8081", // iOS simulator
  "http://10.0.2.2:8081", // Android emulator
  "http://10.0.2.2:8000", // Android emulator direct access
].filter(Boolean); // Remove any undefined values

// CORS configuration using config system
console.log("Allowed CORS Origins:", allowedOrigins);
console.log("NODE_ENV:", process.env.NODE_ENV);

app.use(
  cors({
    origin: function (origin, callback) {
      console.log("CORS request from origin:", origin);

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // In development, allow all origins for easier testing
      if (process.env.NODE_ENV === "development") {
        console.log("Development mode: allowing all origins");
        return callback(null, true);
      }

      if (allowedOrigins.indexOf(origin) !== -1) {
        console.log("Origin allowed:", origin);
        callback(null, true);
      } else {
        console.log("Origin blocked:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "token"],
  })
);
app.use(helmet());
app.use(globalLimiter);
app.use(express.json());

// dbConnect();
connectCloudinary();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesPath = path.resolve(__dirname, "./routes");
const routeFiles = readdirSync(routesPath);
routeFiles.map(async (file) => {
  const routeModule = await import(`./routes/${file}`);
  app.use("/", routeModule.default);
});

app.get("/", (req, res) => {
  res.send("You should not be here!");
});

app.use(notFoundHandler);
app.use(globalErrorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

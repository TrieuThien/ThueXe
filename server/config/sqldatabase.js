import "dotenv/config";
import mysql from "mysql2/promise";

function buildPoolConfig() {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Parse the connection URL into explicit options so we can
  // layer in keep-alive / reconnect settings that are not
  // forwarded when passing a raw URL string to createPool().
  const url = new URL(rawUrl);

  const extraParams = {};
  for (const [key, value] of url.searchParams.entries()) {
    extraParams[key] = value;
  }
  // Enforce UTC at app level; do not allow URL params to override timezone.
  delete extraParams.timezone;

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),

    // Use UTC timezone to avoid DST drift and keep date parsing consistent.
    timezone: "Z",
    dateStrings: false,

    // Pool sizing
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    // Keep connections alive so the MySQL server does not close
    // idle connections and cause ECONNRESET on the next query.
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000, // send first keepalive after 10 s

    // Forward remaining query-string params (e.g. ssl, charset).
    ...extraParams,
  };
}

export const pool = mysql.createPool(buildPoolConfig());

// Normalize each DB session to UTC regardless of server/global timezone.
pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'", (err) => {
    if (err) {
      console.error("[DB timezone init error]", err.message);
    }
  });
});

// Emit pool-level errors to stderr instead of crashing the process.
// Individual query errors are still propagated to callers via rejected promises.
pool.on("error", (err) => {
  console.error("[DB pool error]", err.message);
});

async function checkConnection() {
  try {
    await pool.query("SELECT 1");
    console.log("Connected to SQL Database successfully!");
  } catch (err) {
    console.error("Error connecting to SQL Database:", err.message);
  }
}

checkConnection();

export default pool;

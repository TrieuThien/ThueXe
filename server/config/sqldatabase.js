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

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),

    // Pool sizing
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    // Keep connections alive so the MySQL server does not close
    // idle connections and cause ECONNRESET on the next query.
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000, // send first keepalive after 10 s

    // Forward any extra query-string params (e.g. ssl, charset, timezone).
    ...extraParams,
  };
}

export const pool = mysql.createPool(buildPoolConfig());

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

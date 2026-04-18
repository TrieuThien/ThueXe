/**
 * Migration runner
 * Usage: node scripts/migrate.mjs
 *
 * Reads all .sql files from server/migrations/, tracks which ones have
 * already been applied in the `schema_migrations` table, and runs only
 * the pending ones in filename order.
 */

import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sqldb from "../config/sqldatabase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../migrations");

async function ensureMigrationsTable() {
    await sqldb.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
            filename   VARCHAR(255) NOT NULL,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_schema_migrations_filename (filename)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci
    `);
}

async function getAppliedMigrations() {
    const [rows] = await sqldb.query(
        "SELECT filename FROM schema_migrations ORDER BY filename ASC"
    );
    return new Set(rows.map((r) => r.filename));
}

async function runMigration(filename, sql) {
    // Split on semicolons to handle multi-statement migration files.
    // Filter out empty strings that result from trailing semicolons.
    const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);

    for (const statement of statements) {
        await sqldb.query(statement);
    }

    await sqldb.query(
        "INSERT INTO schema_migrations (filename) VALUES (?)",
        [filename]
    );
}

async function main() {
    await ensureMigrationsTable();

    const applied = await getAppliedMigrations();

    const pending = readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith(".sql"))
        .sort()
        .filter((f) => !applied.has(f));

    if (pending.length === 0) {
        console.log("No pending migrations.");
        return;
    }

    console.log(`Found ${pending.length} pending migration(s):\n`);

    for (const filename of pending) {
        const filepath = path.join(MIGRATIONS_DIR, filename);
        const sql = readFileSync(filepath, "utf8");

        process.stdout.write(`  Running ${filename} ... `);

        try {
            await runMigration(filename, sql);
            console.log("OK");
        } catch (err) {
            console.log("FAILED");
            console.error(`\n  Error in ${filename}:`, err.message);
            process.exitCode = 1;
            return;
        }
    }

    console.log("\nAll migrations applied successfully.");
}

try {
    await main();
} catch (err) {
    console.error("Migration runner failed:", err.message);
    process.exitCode = 1;
} finally {
    await sqldb.end();
}

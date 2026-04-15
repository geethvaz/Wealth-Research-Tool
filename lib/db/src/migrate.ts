/**
 * migrate.ts — run schema creation against the database.
 *
 * Usage:
 *   pnpm --filter @workspace/db exec tsx src/migrate.ts
 *
 * This script uses drizzle-kit push under the hood via the push script
 * in package.json, but can also be invoked directly to apply any
 * pending drizzle migrations from the ./migrations folder.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set before running migrations.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, "../migrations");

console.log("Running migrations from:", migrationsFolder);

await migrate(db, { migrationsFolder });

console.log("Migrations complete.");
await pool.end();

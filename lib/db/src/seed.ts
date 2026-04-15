/**
 * seed.ts — populate the companies table with the initial watchlist.
 *
 * Usage:
 *   pnpm --filter @workspace/db exec tsx src/seed.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { companiesTable } from "./schema/index.ts";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set before seeding.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const companies = [
  {
    ticker: "ADBE",
    name: "Adobe Inc.",
    exchange: "NASDAQ",
    company_type: "Software",
    status: "current" as const,
    last_updated: new Date("2026-04-15"),
  },
  {
    ticker: "JPM",
    name: "JPMorgan Chase",
    exchange: "NYSE",
    company_type: "Banking",
    status: "current" as const,
    last_updated: new Date("2026-04-15"),
  },
  {
    ticker: "SPGI",
    name: "S&P Global",
    exchange: "NYSE",
    company_type: "Financials",
    status: "current" as const,
    last_updated: new Date("2026-04-14"),
  },
  {
    ticker: "PLTR",
    name: "Palantir",
    exchange: "NYSE",
    company_type: "Software",
    status: "needs_update" as const,
    last_updated: new Date("2026-03-28"),
  },
  {
    ticker: "C",
    name: "Citigroup",
    exchange: "NYSE",
    company_type: "Banking",
    status: "current" as const,
    last_updated: new Date("2026-04-15"),
  },
  {
    ticker: "SEHK-700",
    name: "Tencent Holdings",
    exchange: "SEHK",
    company_type: "Internet",
    status: "needs_update" as const,
    last_updated: new Date("2026-04-10"),
  },
];

console.log("Seeding companies table...");

await db
  .insert(companiesTable)
  .values(companies)
  .onConflictDoNothing({ target: companiesTable.ticker });

console.log(`Seeded ${companies.length} companies.`);
await pool.end();

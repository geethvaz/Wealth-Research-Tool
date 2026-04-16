import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const checks: Record<string, string> = {
    status: "ok",
    DATABASE_URL: process.env.DATABASE_URL ? "set" : "NOT SET",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? "set" : "NOT SET",
  };

  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      // Raw SQL — bypass Drizzle to see the real Postgres error
      const result = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
      checks.tables = JSON.stringify(result.map((r: Record<string, string>) => r.table_name));

      // Try querying companies
      const companies = await sql`SELECT id, ticker, name FROM companies LIMIT 3`;
      checks.companies = JSON.stringify(companies);
    } catch (err) {
      checks.db_error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    }
  }

  return NextResponse.json(checks);
}

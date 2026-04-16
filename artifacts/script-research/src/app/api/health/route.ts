import { NextResponse } from "next/server";

export async function GET() {
  // Test 1: basic response
  const checks: Record<string, string> = {
    status: "ok",
    DATABASE_URL: process.env.DATABASE_URL ? "set" : "NOT SET",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? "set" : "NOT SET",
  };

  // Test 2: try importing db
  try {
    const { getDb, companiesTable } = await import("@/lib/db");
    checks.db_import = "ok";

    // Test 3: try connecting
    const db = getDb();
    const result = await db.select().from(companiesTable).limit(1);
    checks.db_query = `ok (${result.length} rows)`;
  } catch (err) {
    checks.db_error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(checks);
}

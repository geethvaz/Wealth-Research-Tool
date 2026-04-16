import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }

  const sql = neon(process.env.DATABASE_URL);
  const log: string[] = [];

  try {
    // Create enums
    await sql`DO $$ BEGIN
      CREATE TYPE company_status AS ENUM ('current', 'needs_update');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`;
    log.push("enum company_status created");

    await sql`DO $$ BEGIN
      CREATE TYPE job_status AS ENUM ('pending', 'processing', 'complete', 'failed');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`;
    log.push("enum job_status created");

    await sql`DO $$ BEGIN
      CREATE TYPE file_type AS ENUM ('income_statement', 'cash_flow', 'balance_sheet', 'ratios', 'segments', 'screenshot');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`;
    log.push("enum file_type created");

    // Create tables
    await sql`CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      ticker TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      exchange TEXT,
      company_type TEXT,
      status company_status NOT NULL DEFAULT 'current',
      last_updated TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`;
    log.push("table companies created");

    await sql`CREATE TABLE IF NOT EXISTS build_jobs (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      status job_status NOT NULL DEFAULT 'pending',
      company_type_detected TEXT,
      error_message TEXT,
      onedrive_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP
    )`;
    log.push("table build_jobs created");

    await sql`CREATE TABLE IF NOT EXISTS uploaded_files (
      id SERIAL PRIMARY KEY,
      job_id INTEGER NOT NULL REFERENCES build_jobs(id) ON DELETE CASCADE,
      file_type file_type NOT NULL,
      original_filename TEXT NOT NULL,
      file_data TEXT,
      is_screenshot BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`;
    log.push("table uploaded_files created");

    await sql`CREATE TABLE IF NOT EXISTS core_sheets (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      quarters JSONB,
      income_statement JSONB,
      cash_flow JSONB,
      balance_sheet JSONB,
      valuation JSONB,
      segments JSONB,
      bull_bear JSONB,
      screenshot_data JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`;
    log.push("table core_sheets created");

    // Add unique constraint on core_sheets.company_id if not exists
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS core_sheets_company_id_unique ON core_sheets(company_id)`;
    log.push("unique index on core_sheets.company_id ensured");

    // No seed data — companies are created via the upload flow
    log.push("tables ready (no seed data)");

    // Clean up seeded companies that have no build jobs (never had files uploaded)
    await sql`DELETE FROM companies WHERE id NOT IN (SELECT DISTINCT company_id FROM build_jobs)`;
    log.push("removed companies with no uploaded data");

    // Verify
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    const companies = await sql`SELECT id, ticker, name FROM companies ORDER BY id`;

    return NextResponse.json({
      success: true,
      log,
      tables: tables.map((r: Record<string, string>) => r.table_name),
      companies,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, log }, { status: 500 });
  }
}

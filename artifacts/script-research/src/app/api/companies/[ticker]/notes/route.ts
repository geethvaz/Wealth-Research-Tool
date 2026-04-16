import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureNotesColumn(sql: any) {
  try {
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''`;
  } catch {
    // Column may already exist or migration already ran — safe to ignore
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  try {
    const { ticker } = await params;
    const sql = neon(process.env.DATABASE_URL!);
    await ensureNotesColumn(sql);

    const rows = await sql`
      SELECT COALESCE(notes, '') as notes FROM companies WHERE UPPER(ticker) = ${ticker.toUpperCase()} LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ notes: rows[0].notes ?? "" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  try {
    const { ticker } = await params;
    const body = await req.json();
    const notes = typeof body.notes === "string" ? body.notes : "";

    const sql = neon(process.env.DATABASE_URL!);
    await ensureNotesColumn(sql);

    const result = await sql`
      UPDATE companies SET notes = ${notes} WHERE UPPER(ticker) = ${ticker.toUpperCase()} RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, notes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

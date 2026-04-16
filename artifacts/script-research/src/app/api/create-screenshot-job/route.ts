import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, companiesTable, buildJobsTable } from "@/lib/db";

export async function POST(req: Request) {
  let body: { ticker?: string; exchange?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ticker = body.ticker?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  const exchange = body.exchange?.trim().toUpperCase() || null;

  try {
    const db = getDb();

    // Upsert company
    let company = (
      await db
        .select()
        .from(companiesTable)
        .where(eq(companiesTable.ticker, ticker))
    )[0];

    if (!company) {
      const [inserted] = await db
        .insert(companiesTable)
        .values({
          ticker,
          name: ticker,
          exchange,
          company_type: null,
          status: "needs_update",
          last_updated: new Date(),
        })
        .returning();
      company = inserted;
    }

    // Create build_job
    const [job] = await db
      .insert(buildJobsTable)
      .values({ company_id: company.id, status: "pending" })
      .returning();

    return NextResponse.json({
      jobId: job.id,
      companyId: company.id,
      ticker,
      exchange,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

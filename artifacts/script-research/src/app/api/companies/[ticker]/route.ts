import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, companiesTable, coreSheetsTable } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  try {
    const { ticker } = await params;
    const db = getDb();
    const [company] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.ticker, ticker.toUpperCase()));

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const [coreSheet] = await db
      .select()
      .from(coreSheetsTable)
      .where(eq(coreSheetsTable.company_id, company.id))
      .limit(1);

    return NextResponse.json({ ...company, core_sheet: coreSheet || null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

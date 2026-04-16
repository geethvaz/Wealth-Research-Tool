import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, companiesTable } from "@/lib/db";

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
    return NextResponse.json(company);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

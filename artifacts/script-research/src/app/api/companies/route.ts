import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, companiesTable, coreSheetsTable } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const companies = await db
      .select()
      .from(companiesTable)
      .orderBy(companiesTable.id);

    // Fetch core_sheets data for each company
    const enriched = await Promise.all(
      companies.map(async (c) => {
        const [cs] = await db
          .select({
            income_statement: coreSheetsTable.income_statement,
            cash_flow: coreSheetsTable.cash_flow,
            balance_sheet: coreSheetsTable.balance_sheet,
            valuation: coreSheetsTable.valuation,
            bull_bear: coreSheetsTable.bull_bear,
            quarters: coreSheetsTable.quarters,
          })
          .from(coreSheetsTable)
          .where(eq(coreSheetsTable.company_id, c.id))
          .limit(1);

        return { ...c, core_data: cs || null };
      }),
    );

    return NextResponse.json(enriched);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

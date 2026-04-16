import { NextResponse } from "next/server";
import { getDb, companiesTable } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const companies = await db
      .select()
      .from(companiesTable)
      .orderBy(companiesTable.id);
    return NextResponse.json(companies);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

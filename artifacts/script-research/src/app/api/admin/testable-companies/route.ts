import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireAdmin } from "@/lib/admin-auth";

export const maxDuration = 15;

// Companies with at least one core_sheet row — safe to run a draft prompt against.
export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const sqlClient = neon(process.env.DATABASE_URL!);
  const rows = await sqlClient`
    SELECT c.ticker, c.name
    FROM companies c
    INNER JOIN core_sheets s ON s.company_id = c.id
    ORDER BY c.ticker ASC
  `;
  return NextResponse.json({
    companies: rows.map((r) => ({ ticker: r.ticker as string, name: r.name as string })),
  });
}

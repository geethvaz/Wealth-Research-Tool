import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

const companyStatusEnum = pgEnum("company_status", ["current", "needs_update"]);

const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  ticker: text("ticker").notNull(),
  name: text("name").notNull(),
  exchange: text("exchange"),
  company_type: text("company_type"),
  status: companyStatusEnum("status").notNull().default("current"),
  last_updated: timestamp("last_updated"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  return drizzle(neon(process.env.DATABASE_URL));
}

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

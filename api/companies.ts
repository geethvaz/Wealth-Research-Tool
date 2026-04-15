import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

// Inline schema — keeps the function self-contained for Vercel bundling
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "DATABASE_URL is not configured" });
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  const companies = await db
    .select()
    .from(companiesTable)
    .orderBy(companiesTable.id);

  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(200).json(companies);
}

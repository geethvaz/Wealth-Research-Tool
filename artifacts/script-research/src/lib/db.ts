import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

// ─── Enums (defined once, shared across all routes) ─────────────────────────

export const companyStatusEnum = pgEnum("company_status", ["current", "needs_update"]);
export const jobStatusEnum = pgEnum("job_status", ["pending", "processing", "complete", "failed"]);
export const fileTypeEnum = pgEnum("file_type", [
  "income_statement",
  "cash_flow",
  "balance_sheet",
  "ratios",
  "segments",
  "screenshot",
]);

// ─── Tables ─────────────────────────────────────────────────────────────────

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  ticker: text("ticker").notNull(),
  name: text("name").notNull(),
  exchange: text("exchange"),
  company_type: text("company_type"),
  status: companyStatusEnum("status").notNull().default("current"),
  last_updated: timestamp("last_updated"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const buildJobsTable = pgTable("build_jobs", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").notNull(),
  status: jobStatusEnum("status").notNull().default("pending"),
  company_type_detected: text("company_type_detected"),
  error_message: text("error_message"),
  onedrive_url: text("onedrive_url"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  completed_at: timestamp("completed_at"),
});

export const uploadedFilesTable = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  job_id: integer("job_id").notNull(),
  file_type: fileTypeEnum("file_type").notNull(),
  original_filename: text("original_filename").notNull(),
  file_data: text("file_data"),
  is_screenshot: boolean("is_screenshot").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const coreSheetsTable = pgTable("core_sheets", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").notNull(),
  quarters: jsonb("quarters"),
  income_statement: jsonb("income_statement"),
  cash_flow: jsonb("cash_flow"),
  balance_sheet: jsonb("balance_sheet"),
  valuation: jsonb("valuation"),
  segments: jsonb("segments"),
  bull_bear: jsonb("bull_bear"),
  screenshot_data: jsonb("screenshot_data"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Database connection ────────────────────────────────────────────────────

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(neon(url));
}

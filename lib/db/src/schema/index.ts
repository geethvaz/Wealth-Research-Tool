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
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const companyStatusEnum = pgEnum("company_status", [
  "current",
  "needs_update",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "complete",
  "failed",
]);

export const fileTypeEnum = pgEnum("file_type", [
  "income_statement",
  "cash_flow",
  "balance_sheet",
  "ratios",
  "segments",
  "screenshot",
]);

// ─── companies ────────────────────────────────────────────────────────────────

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  ticker: text("ticker").notNull().unique(),
  name: text("name").notNull(),
  exchange: text("exchange"),
  company_type: text("company_type"),
  status: companyStatusEnum("status").notNull().default("current"),
  last_updated: timestamp("last_updated"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({
  id: true,
  created_at: true,
});
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;

// ─── core_sheets ─────────────────────────────────────────────────────────────

export const coreSheetsTable = pgTable("core_sheets", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  quarters: jsonb("quarters").$type<string[]>(),
  income_statement: jsonb("income_statement"),
  cash_flow: jsonb("cash_flow"),
  balance_sheet: jsonb("balance_sheet"),
  valuation: jsonb("valuation"),
  segments: jsonb("segments"),
  bull_bear: jsonb("bull_bear"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCoreSheetSchema = createInsertSchema(coreSheetsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertCoreSheet = z.infer<typeof insertCoreSheetSchema>;
export type CoreSheet = typeof coreSheetsTable.$inferSelect;

// ─── build_jobs ───────────────────────────────────────────────────────────────

export const buildJobsTable = pgTable("build_jobs", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  status: jobStatusEnum("status").notNull().default("pending"),
  company_type_detected: text("company_type_detected"),
  error_message: text("error_message"),
  onedrive_url: text("onedrive_url"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  completed_at: timestamp("completed_at"),
});

export const insertBuildJobSchema = createInsertSchema(buildJobsTable).omit({
  id: true,
  created_at: true,
});
export type InsertBuildJob = z.infer<typeof insertBuildJobSchema>;
export type BuildJob = typeof buildJobsTable.$inferSelect;

// ─── uploaded_files ───────────────────────────────────────────────────────────

export const uploadedFilesTable = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  job_id: integer("job_id")
    .notNull()
    .references(() => buildJobsTable.id, { onDelete: "cascade" }),
  file_type: fileTypeEnum("file_type").notNull(),
  original_filename: text("original_filename").notNull(),
  file_data: text("file_data"), // base64-encoded file bytes
  is_screenshot: boolean("is_screenshot").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertUploadedFileSchema = createInsertSchema(
  uploadedFilesTable,
).omit({ id: true, created_at: true });
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type UploadedFile = typeof uploadedFilesTable.$inferSelect;

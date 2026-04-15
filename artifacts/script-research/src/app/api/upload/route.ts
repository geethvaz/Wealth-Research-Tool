import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

// ─── Inline schema ────────────────────────────────────────────────────────────

const companyStatusEnum = pgEnum("company_status", ["current", "needs_update"]);
const jobStatusEnum = pgEnum("job_status", ["pending", "processing", "complete", "failed"]);
const fileTypeEnum = pgEnum("file_type", [
  "income_statement",
  "cash_flow",
  "balance_sheet",
  "ratios",
  "segments",
  "screenshot",
]);

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

const buildJobsTable = pgTable("build_jobs", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").notNull(),
  status: jobStatusEnum("status").notNull().default("pending"),
  company_type_detected: text("company_type_detected"),
  error_message: text("error_message"),
  onedrive_url: text("onedrive_url"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  completed_at: timestamp("completed_at"),
});

const uploadedFilesTable = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  job_id: integer("job_id").notNull(),
  file_type: fileTypeEnum("file_type").notNull(),
  original_filename: text("original_filename").notNull(),
  file_data: text("file_data"),
  is_screenshot: boolean("is_screenshot").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Detection helpers ────────────────────────────────────────────────────────

type DetectedFileType =
  | "income_statement"
  | "cash_flow"
  | "balance_sheet"
  | "ratios"
  | "segments";

function detectFileType(filename: string): DetectedFileType | null {
  const lower = filename.toLowerCase();
  if (lower.includes("income statement")) return "income_statement";
  if (lower.includes("cash flow")) return "cash_flow";
  if (lower.includes("balance sheet")) return "balance_sheet";
  if (lower.includes("ratios")) return "ratios";
  if (lower.includes("segments")) return "segments";
  return null;
}

/**
 * Fiscal.ai filenames follow the pattern:
 *   NYSE-ADBE-Income Statement-Quarterly.xlsx
 *   NasdaqGS-ADBE-Income Statement-Quarterly.xlsx
 *   SEHK-700-Income Statement-Quarterly.xlsx  (ticker can contain hyphens)
 *
 * Strategy: split on hyphen, position[0] = exchange, position[1] = ticker.
 * For SEHK tickers like SEHK-700 the exchange is SEHK and ticker is 700
 * but we normalise them as "SEHK-700" for consistency.
 */
function detectTickerAndExchange(filename: string): {
  ticker: string | null;
  exchange: string | null;
} {
  // Strip extension
  const base = filename.replace(/\.[^.]+$/, "");
  const parts = base.split("-");
  if (parts.length < 3) return { ticker: null, exchange: null };

  const exchange = parts[0].trim();
  const ticker = parts[1].trim();

  // Normalise SEHK tickers (e.g. exchange=SEHK, ticker=700 → "SEHK-700")
  const normalisedTicker =
    exchange.toUpperCase() === "SEHK" ? `SEHK-${ticker}` : ticker.toUpperCase();

  return { ticker: normalisedTicker, exchange: exchange.toUpperCase() };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const fileEntries = formData.getAll("files") as File[];
  if (fileEntries.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (fileEntries.length > 5) {
    return NextResponse.json({ error: "Maximum 5 files per request" }, { status: 400 });
  }

  // Detect ticker/exchange from the first file that has a recognisable pattern
  let detectedTicker: string | null = null;
  let detectedExchange: string | null = null;

  for (const file of fileEntries) {
    const { ticker, exchange } = detectTickerAndExchange(file.name);
    if (ticker) {
      detectedTicker = ticker;
      detectedExchange = exchange;
      break;
    }
  }

  if (!detectedTicker) {
    return NextResponse.json(
      { error: "Could not detect ticker from filenames. Expected format: EXCHANGE-TICKER-Type-Period.xlsx" },
      { status: 422 },
    );
  }

  const db = drizzle(neon(process.env.DATABASE_URL));

  // ── Step 5: Upsert company ──────────────────────────────────────────────────
  let company = (
    await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.ticker, detectedTicker))
  )[0];

  if (!company) {
    const [inserted] = await db
      .insert(companiesTable)
      .values({
        ticker: detectedTicker,
        name: detectedTicker, // placeholder — updated when core sheet is built
        exchange: detectedExchange,
        company_type: null,
        status: "needs_update",
        last_updated: new Date(),
      })
      .returning();
    company = inserted;
  }

  // ── Create build_job record ─────────────────────────────────────────────────
  const [job] = await db
    .insert(buildJobsTable)
    .values({ company_id: company.id, status: "pending" })
    .returning();

  // ── Store files & build detection map ──────────────────────────────────────
  const filesDetected: Record<DetectedFileType, boolean> = {
    income_statement: false,
    cash_flow: false,
    balance_sheet: false,
    ratios: false,
    segments: false,
  };

  for (const file of fileEntries) {
    const fileType = detectFileType(file.name);
    if (!fileType || fileType === "segments") {
      // treat "segments" detection as segments_kpis for the checklist
    }

    const mappedType = fileType ?? "income_statement"; // fallback — still stored
    if (fileType) filesDetected[fileType] = true;

    // Read bytes and encode as base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    await db.insert(uploadedFilesTable).values({
      job_id: job.id,
      file_type: mappedType === "segments" ? "segments" : (mappedType as typeof fileTypeEnum.enumValues[number]),
      original_filename: file.name,
      file_data: base64,
      is_screenshot: false,
    });
  }

  return NextResponse.json({
    jobId: job.id,
    ticker: detectedTicker,
    exchange: detectedExchange,
    filesDetected: {
      income_statement: filesDetected.income_statement,
      cash_flow: filesDetected.cash_flow,
      balance_sheet: filesDetected.balance_sheet,
      ratios: filesDetected.ratios,
      segments_kpis: filesDetected.segments,
    },
  });
}

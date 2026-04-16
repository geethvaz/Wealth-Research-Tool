import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, companiesTable, buildJobsTable, uploadedFilesTable } from "@/lib/db";

export const maxDuration = 30;

// ─── Detection helpers ────────────────────────────────────────────────────────

type DetectedFileType =
  | "income_statement"
  | "cash_flow"
  | "balance_sheet"
  | "ratios"
  | "segments";

function detectFileType(filename: string): DetectedFileType | null {
  const lower = filename.toLowerCase().replace(/[_\s]+/g, " ");
  if (
    lower.includes("income statement") ||
    lower.includes("incomestatement") ||
    lower.includes("income stat") ||
    lower.includes("profit & loss") ||
    lower.includes("profit and loss") ||
    lower.includes("p&l") ||
    lower.includes("pnl")
  )
    return "income_statement";
  if (
    lower.includes("cash flow") ||
    lower.includes("cashflow") ||
    lower.includes("cash flow statement")
  )
    return "cash_flow";
  if (
    lower.includes("balance sheet") ||
    lower.includes("balancesheet") ||
    lower.includes("balance stat")
  )
    return "balance_sheet";
  if (lower.includes("ratio")) return "ratios";
  if (lower.includes("segment") || lower.includes("kpi")) return "segments";
  return null;
}

function detectTickerAndExchange(filename: string): {
  ticker: string | null;
  exchange: string | null;
} {
  const base = filename.replace(/\.[^.]+$/, "");
  let parts: string[];
  if (base.includes("-")) {
    parts = base.split("-");
  } else if (base.includes("_")) {
    parts = base.split("_");
  } else {
    return { ticker: null, exchange: null };
  }
  if (parts.length < 3) return { ticker: null, exchange: null };
  const exchange = parts[0].trim();
  const ticker = parts[1].trim();
  if (!exchange || !ticker) return { ticker: null, exchange: null };
  const normalisedTicker =
    exchange.toUpperCase() === "SEHK" ? `SEHK-${ticker}` : ticker.toUpperCase();
  return { ticker: normalisedTicker, exchange: exchange.toUpperCase() };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
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

  try {
    const db = getDb();

    // Upsert company
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
          name: detectedTicker,
          exchange: detectedExchange,
          company_type: null,
          status: "needs_update",
          last_updated: new Date(),
        })
        .returning();
      company = inserted;
    }

    // Create build_job
    const [job] = await db
      .insert(buildJobsTable)
      .values({ company_id: company.id, status: "pending" })
      .returning();

    // Store files
    const filesDetected: Record<DetectedFileType, boolean> = {
      income_statement: false,
      cash_flow: false,
      balance_sheet: false,
      ratios: false,
      segments: false,
    };

    for (const file of fileEntries) {
      const fileType = detectFileType(file.name);
      if (fileType) filesDetected[fileType] = true;
      if (!fileType) continue;

      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      await db.insert(uploadedFilesTable).values({
        job_id: job.id,
        file_type: fileType,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

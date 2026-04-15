import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

// ─── Inline schema ────────────────────────────────────────────────────────────

const companyStatusEnum = pgEnum("company_status", ["current", "needs_update"]);
const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "complete",
  "failed",
]);

const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  ticker: text("ticker").notNull(),
  status: companyStatusEnum("status").notNull(),
});

const buildJobsTable = pgTable("build_jobs", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").notNull(),
  status: jobStatusEnum("status").notNull(),
  error_message: text("error_message"),
  completed_at: timestamp("completed_at"),
});

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const jobIdNum = parseInt(jobId, 10);

  if (isNaN(jobIdNum)) {
    return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  // Mark job as processing
  await db
    .update(buildJobsTable)
    .set({ status: "processing" })
    .where(eq(buildJobsTable.id, jobIdNum));

  try {
    // Resolve the Python function URL.
    // On Vercel: VERCEL_URL is set automatically (no protocol).
    // Locally: fall back to localhost.
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    const pythonUrl = `${baseUrl}/api/build_core_sheet?jobId=${jobIdNum}`;

    const pythonRes = await fetch(pythonUrl, {
      // Give the Python function up to 55 s (Vercel limit is 60 s on Pro)
      signal: AbortSignal.timeout(55_000),
    });

    if (!pythonRes.ok) {
      const errBody = await pythonRes.json().catch(() => ({}));
      throw new Error(
        (errBody as { error?: string }).error ??
          `Python build failed: ${pythonRes.status}`,
      );
    }

    const excelBuffer = await pythonRes.arrayBuffer();

    // Mark job complete
    await db
      .update(buildJobsTable)
      .set({ status: "complete", completed_at: new Date() })
      .where(eq(buildJobsTable.id, jobIdNum));

    // Update company status → current
    const jobs = await db
      .select({ company_id: buildJobsTable.company_id })
      .from(buildJobsTable)
      .where(eq(buildJobsTable.id, jobIdNum));

    if (jobs[0]) {
      await db
        .update(companiesTable)
        .set({ status: "current" })
        .where(eq(companiesTable.id, jobs[0].company_id));
    }

    // Stream the Excel file back to the client
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="CoreSheet_job${jobIdNum}.xlsx"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    await db
      .update(buildJobsTable)
      .set({ status: "failed", error_message: message })
      .where(eq(buildJobsTable.id, jobIdNum));

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

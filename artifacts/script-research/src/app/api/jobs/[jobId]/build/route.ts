import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, companiesTable, buildJobsTable } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const jobIdNum = parseInt(jobId, 10);

  if (isNaN(jobIdNum)) {
    return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
  }

  const db = getDb();

  // Mark job as processing
  await db
    .update(buildJobsTable)
    .set({ status: "processing" })
    .where(eq(buildJobsTable.id, jobIdNum));

  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    const pythonUrl = `${baseUrl}/api/build_core_sheet?jobId=${jobIdNum}`;

    const pythonRes = await fetch(pythonUrl, {
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

    // Update company status
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

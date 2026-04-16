import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, companiesTable, buildJobsTable } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const jobIdNum = parseInt(jobId, 10);
    if (isNaN(jobIdNum)) {
      return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
    }

    const db = getDb();

    // Mark job complete
    await db
      .update(buildJobsTable)
      .set({ status: "complete", completed_at: new Date() })
      .where(eq(buildJobsTable.id, jobIdNum));

    // Update company status to current
    const jobs = await db
      .select({ company_id: buildJobsTable.company_id })
      .from(buildJobsTable)
      .where(eq(buildJobsTable.id, jobIdNum));

    if (jobs[0]) {
      await db
        .update(companiesTable)
        .set({ status: "current", last_updated: new Date() })
        .where(eq(companiesTable.id, jobs[0].company_id));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, buildJobsTable, uploadedFilesTable } from "@/lib/db";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const jobIdRaw = formData.get("jobId");
  if (!jobIdRaw) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }
  const jobId = Number(jobIdRaw);
  if (isNaN(jobId)) {
    return NextResponse.json({ error: "jobId must be a number" }, { status: 400 });
  }

  const imageEntries = formData.getAll("screenshots") as File[];
  if (imageEntries.length === 0) {
    return NextResponse.json({ error: "No screenshot files provided" }, { status: 400 });
  }

  for (const file of imageEntries) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Use PNG or JPG.` },
        { status: 422 },
      );
    }
  }

  try {
    const db = getDb();

    const [job] = await db
      .select()
      .from(buildJobsTable)
      .where(eq(buildJobsTable.id, jobId));

    if (!job) {
      return NextResponse.json({ error: `Build job ${jobId} not found` }, { status: 404 });
    }

    for (const file of imageEntries) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      await db.insert(uploadedFilesTable).values({
        job_id: jobId,
        file_type: "screenshot",
        original_filename: file.name,
        file_data: base64,
        is_screenshot: true,
      });
    }

    return NextResponse.json({
      jobId,
      screenshotCount: imageEntries.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

const jobStatusEnum = pgEnum("job_status", ["pending", "processing", "complete", "failed"]);
const fileTypeEnum = pgEnum("file_type", [
  "income_statement",
  "cash_flow",
  "balance_sheet",
  "ratios",
  "segments",
  "screenshot",
]);

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

// ─── Route handler ────────────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

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

  // jobId is required — screenshots are linked to an existing build job
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

  // Validate file types
  for (const file of imageEntries) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Use PNG or JPG.` },
        { status: 422 },
      );
    }
  }

  const db = drizzle(neon(process.env.DATABASE_URL));

  // Verify job exists
  const [job] = await db
    .select()
    .from(buildJobsTable)
    .where(eq(buildJobsTable.id, jobId));

  if (!job) {
    return NextResponse.json({ error: `Build job ${jobId} not found` }, { status: 404 });
  }

  // Store each screenshot
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
}

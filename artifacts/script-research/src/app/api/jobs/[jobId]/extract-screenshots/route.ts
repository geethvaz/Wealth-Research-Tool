import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { getDb, buildJobsTable, uploadedFilesTable } from "@/lib/db";
import { getAnthropicClient } from "@/lib/anthropic";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a financial data extraction specialist. You will receive a screenshot from fiscal.ai showing financial statement data for a company. Extract ALL visible data into structured JSON. Return ONLY valid JSON, no explanation text.

Return this exact structure:
{
  "company_name": "string or null",
  "ticker": "string or null",
  "statement_type": "income_statement | balance_sheet | cash_flow | ratios | segments_kpis | unknown",
  "currency": "string (e.g. USD, CNY, HKD)",
  "unit": "string (e.g. millions, billions)",
  "quarters": ["array of column header strings"],
  "rows": [
    {
      "metric": "string",
      "values": ["array of numbers or null, matching quarters array length"]
    }
  ]
}`;

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

    // Fetch screenshots for this job
    const screenshots = await db
      .select()
      .from(uploadedFilesTable)
      .where(eq(uploadedFilesTable.job_id, jobIdNum));

    const screenshotFiles = screenshots.filter((f) => f.is_screenshot && f.file_data);
    if (screenshotFiles.length === 0) {
      return NextResponse.json({ error: "No screenshots found for this job" }, { status: 404 });
    }

    const anthropic = getAnthropicClient();
    const extractions: unknown[] = [];
    let detectedTicker: string | null = null;

    for (const file of screenshotFiles) {
      const mediaType = file.original_filename.toLowerCase().endsWith(".png")
        ? "image/png" as const
        : "image/jpeg" as const;

      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: file.file_data!,
                },
              },
              {
                type: "text",
                text: `Extract all financial data from this screenshot. Filename: ${file.original_filename}`,
              },
            ],
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        try {
          const parsed = JSON.parse(textBlock.text);
          extractions.push(parsed);
          if (parsed.ticker && !detectedTicker) {
            detectedTicker = parsed.ticker;
          }
        } catch {
          extractions.push({ raw: textBlock.text, parse_error: true });
        }
      }
    }

    // Store in core_sheets via raw SQL (screenshot_data column)
    const sql = neon(process.env.DATABASE_URL!);
    const jobs = await db
      .select({ company_id: buildJobsTable.company_id })
      .from(buildJobsTable)
      .where(eq(buildJobsTable.id, jobIdNum));

    if (jobs[0]) {
      await sql`
        INSERT INTO core_sheets (company_id, screenshot_data, created_at, updated_at)
        VALUES (${jobs[0].company_id}, ${JSON.stringify(extractions)}::jsonb, NOW(), NOW())
        ON CONFLICT (company_id) DO UPDATE SET
          screenshot_data = ${JSON.stringify(extractions)}::jsonb,
          updated_at = NOW()
      `;

      // Update job with detected company type
      if (detectedTicker) {
        await db
          .update(buildJobsTable)
          .set({ company_type_detected: "screenshot" })
          .where(eq(buildJobsTable.id, jobIdNum));
      }
    }

    return NextResponse.json({
      success: true,
      statementsFound: extractions.length,
      ticker: detectedTicker,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { getDb, companiesTable, buildJobsTable } from "@/lib/db";
import { getAnthropicClient } from "@/lib/anthropic";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a senior equity research analyst at a top-tier wealth management firm. You have access to the company's actual quarterly financial data. Analyze the data carefully and generate a specific, data-driven investment thesis.

Rules:
- Every bullet point MUST reference actual numbers, margins, growth rates, or trends from the data provided
- Be direct and specific — no generic statements like "strong market position" without data backing
- Reference specific quarters, YoY changes, margin trends, and absolute figures
- If you see declining metrics, call them out honestly in the bear case
- Tailwinds should be structural/industry-level drivers specific to the company's business

Return ONLY valid JSON in this exact structure:
{
  "bull_case": [
    "string (3-5 items, each 1-2 sentences with specific numbers)"
  ],
  "bear_case": [
    "string (3-5 items, each 1-2 sentences with specific numbers)"
  ],
  "tailwinds": [
    "string (3-5 structural tailwinds specific to the company's industry and business model)"
  ],
  "headwinds": [
    "string (3-5 risks or headwinds with data backing where possible)"
  ],
  "watchlist_metrics": [
    "string (5-6 specific metrics to monitor going forward, with current values and why they matter)"
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

    // Get company info via the build job
    const jobs = await db
      .select({ company_id: buildJobsTable.company_id })
      .from(buildJobsTable)
      .where(eq(buildJobsTable.id, jobIdNum));

    if (!jobs[0]) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const [company] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, jobs[0].company_id));

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Fetch key metrics from core_sheets if available
    const sql = neon(process.env.DATABASE_URL!);
    const coreSheets = await sql`
      SELECT quarters, income_statement, cash_flow, balance_sheet, valuation, segments
      FROM core_sheets WHERE company_id = ${company.id} LIMIT 1
    `;

    // Build metrics context for Claude
    const metricsContext = coreSheets.length > 0
      ? JSON.stringify(coreSheets[0], null, 2)
      : "No detailed financial data available. Generate thesis based on company profile.";

    const anthropic = getAnthropicClient();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate investment thesis for ${company.name} (${company.ticker}). Company type: ${company.company_type ?? "unknown"}.\n\nKey metrics:\n${metricsContext}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response from Claude" }, { status: 500 });
    }

    let bullBearData: unknown;
    try {
      bullBearData = JSON.parse(textBlock.text);
    } catch {
      return NextResponse.json(
        { error: "Claude returned invalid JSON", raw: textBlock.text },
        { status: 500 },
      );
    }

    // Ensure unique index exists, then upsert bull_bear
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS core_sheets_company_id_unique ON core_sheets(company_id)`;
    await sql`
      INSERT INTO core_sheets (company_id, bull_bear, created_at, updated_at)
      VALUES (${company.id}, ${JSON.stringify(bullBearData)}::jsonb, NOW(), NOW())
      ON CONFLICT (company_id) DO UPDATE SET
        bull_bear = ${JSON.stringify(bullBearData)}::jsonb,
        updated_at = NOW()
    `;

    return NextResponse.json({
      success: true,
      ticker: company.ticker,
      bull_bear: bullBearData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

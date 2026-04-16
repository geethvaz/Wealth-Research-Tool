import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { getDb, companiesTable, buildJobsTable } from "@/lib/db";
import { getAnthropicClient } from "@/lib/anthropic";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a senior equity research analyst at a top-tier investment firm. Generate a concise, data-driven investment thesis for the company provided. Be direct and specific — no filler. Each bullet point must reference actual numbers.

Return ONLY valid JSON in this exact structure:
{
  "bull_case": [
    "string", "string", "string", "string", "string"
  ],
  "bear_case": [
    "string", "string", "string", "string"
  ],
  "tailwinds": [
    "string", "string", "string", "string"
  ],
  "headwinds": [
    "string", "string", "string", "string"
  ],
  "watchlist_metrics": [
    "string", "string", "string", "string", "string", "string"
  ]
}

Each string should be 1-2 sentences maximum. Reference specific metrics and numbers from the data provided. Do not use generic statements.`;

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
      model: "claude-sonnet-4-6-20250514",
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

    // Store in core_sheets
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

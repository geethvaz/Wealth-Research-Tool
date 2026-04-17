import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { getDb, companiesTable } from "@/lib/db";
import { getAnthropicClient } from "@/lib/anthropic";
import {
  DEFAULT_PROMPTS,
  assembleSystemPrompt,
  loadPrompt,
} from "@/lib/prompts";
import { requireAdmin } from "@/lib/admin-auth";

export const maxDuration = 60;

// POST runs a DRAFT prompt (role_text + rules_text) against a chosen company
// and returns the output alongside the currently-saved prompt's output, so
// the editor can compare side-by-side before deciding to save.
//
// Body: { role_text, rules_text, ticker }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { key } = await params;
  if (!DEFAULT_PROMPTS[key]) {
    return NextResponse.json({ error: "Unknown prompt key" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    role_text?: string;
    rules_text?: string;
    ticker?: string;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const role_text = (body.role_text ?? "").trim();
  const rules_text = (body.rules_text ?? "").trim();
  const ticker = (body.ticker ?? "").trim();
  if (!role_text || !rules_text) {
    return NextResponse.json(
      { error: "role_text and rules_text are required" },
      { status: 400 },
    );
  }
  if (!ticker) {
    return NextResponse.json(
      { error: "Pick a company to test on" },
      { status: 400 },
    );
  }

  const db = getDb();
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.ticker, ticker))
    .limit(1);
  if (!company) {
    return NextResponse.json(
      { error: `Company ${ticker} not found` },
      { status: 404 },
    );
  }

  const sqlClient = neon(process.env.DATABASE_URL!);
  const coreSheets = await sqlClient`
    SELECT quarters, income_statement, cash_flow, balance_sheet, valuation, segments
    FROM core_sheets WHERE company_id = ${company.id} LIMIT 1
  `;
  if (coreSheets.length === 0) {
    return NextResponse.json(
      {
        error: `No financial data found for ${ticker}. Pick a company that's been built at least once.`,
      },
      { status: 400 },
    );
  }

  const metricsContext = JSON.stringify(coreSheets[0], null, 2);
  const userMessage = `Generate investment thesis for ${company.name} (${company.ticker}). Company type: ${company.company_type ?? "unknown"}.\n\nKey metrics:\n${metricsContext}`;

  const saved = await loadPrompt(key);
  const savedSystem = assembleSystemPrompt(saved);
  const draftSystem = assembleSystemPrompt({
    role_text,
    rules_text,
    output_schema: saved.output_schema,
  });

  const anthropic = getAnthropicClient();
  const runOne = async (systemPrompt: string) => {
    const response = await anthropic.messages.create({
      model: saved.model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { raw: "", parsed: null, error: "No text in response" };
    }
    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "");
    }
    try {
      return { raw: textBlock.text, parsed: JSON.parse(jsonText) };
    } catch {
      return {
        raw: textBlock.text,
        parsed: null,
        error: "Claude returned invalid JSON",
      };
    }
  };

  const [currentOutput, draftOutput] = await Promise.all([
    runOne(savedSystem),
    runOne(draftSystem),
  ]);

  return NextResponse.json({
    ticker: company.ticker,
    name: company.name,
    current: currentOutput,
    draft: draftOutput,
  });
}

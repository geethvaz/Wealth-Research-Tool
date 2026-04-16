import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getAnthropicClient } from "@/lib/anthropic";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a senior wealth management advisor. Summarize the portfolio coverage in 3-4 paragraphs. Focus on: sector allocation, valuation spread, key risks, strongest/weakest performers, and what to watch next quarter. Be specific with numbers.`;

export async function POST() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Fetch all companies with their core sheet data
    const companies = await sql`
      SELECT c.ticker, c.name, c.company_type, c.status, c.last_updated,
             cs.income_statement, cs.valuation, cs.cash_flow, cs.segments, cs.bull_bear, cs.quarters
      FROM companies c
      LEFT JOIN core_sheets cs ON cs.company_id = c.id
      ORDER BY c.ticker
    `;

    if (companies.length === 0) {
      return NextResponse.json(
        { error: "No companies in the portfolio" },
        { status: 400 },
      );
    }

    // Build a summary of each company for the prompt
    const summaries = companies.map((c) => {
      const parts: string[] = [`${c.ticker} (${c.name}) — Type: ${c.company_type ?? "unknown"}`];

      if (c.quarters && Array.isArray(c.quarters)) {
        parts.push(`Quarters covered: ${(c.quarters as string[]).slice(-4).join(", ")}`);
      }

      if (c.income_statement && typeof c.income_statement === "object") {
        const is = c.income_statement as Record<string, Record<string, number>>;
        const lastVal = (series: Record<string, number> | undefined) => {
          if (!series) return null;
          const vals = Object.values(series);
          return vals.length > 0 ? vals[vals.length - 1] : null;
        };
        const rev = lastVal(is.revenue);
        const gm = lastVal(is.gross_margin);
        const om = lastVal(is.operating_margin);
        if (rev !== null) parts.push(`Latest quarterly revenue: $${rev >= 1000 ? (rev / 1000).toFixed(1) + "B" : rev.toFixed(0) + "M"}`);
        if (gm !== null) parts.push(`Gross margin: ${(gm * 100).toFixed(1)}%`);
        if (om !== null) parts.push(`Operating margin: ${(om * 100).toFixed(1)}%`);
      }

      if (c.valuation && typeof c.valuation === "object") {
        const v = c.valuation as Record<string, Record<string, number>>;
        const lastVal = (series: Record<string, number> | undefined) => {
          if (!series) return null;
          const vals = Object.values(series);
          return vals.length > 0 ? vals[vals.length - 1] : null;
        };
        const pe = lastVal(v.pe);
        const evEbitda = lastVal(v.ev_ebitda);
        const roe = lastVal(v.roe);
        if (pe !== null) parts.push(`P/E: ${pe.toFixed(1)}x`);
        if (evEbitda !== null) parts.push(`EV/EBITDA: ${evEbitda.toFixed(1)}x`);
        if (roe !== null) parts.push(`ROE: ${(roe * 100).toFixed(1)}%`);
      }

      return parts.join("\n  ");
    });

    const anthropic = getAnthropicClient();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the current portfolio coverage (${companies.length} companies):\n\n${summaries.join("\n\n")}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response from Claude" }, { status: 500 });
    }

    // Strip markdown code fences if present
    let summary = textBlock.text.trim();
    if (summary.startsWith("```")) {
      summary = summary.replace(/^```(?:\w+)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

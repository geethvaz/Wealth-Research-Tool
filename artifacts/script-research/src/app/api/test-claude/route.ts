import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";

export async function GET() {
  try {
    const anthropic = getAnthropicClient();

    // Try multiple model IDs to find which works
    const models = [
      "claude-sonnet-4-5-20250514",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-sonnet-latest",
      "claude-3-haiku-20240307",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
    ];

    const results: Record<string, string> = {};

    for (const model of models) {
      try {
        const response = await anthropic.messages.create({
          model,
          max_tokens: 10,
          messages: [{ role: "user", content: "Say hi" }],
        });
        const text = response.content.find(b => b.type === "text");
        results[model] = `OK: ${text?.type === "text" ? text.text : "no text"}`;
        break; // Found a working model, stop
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results[model] = `FAIL: ${msg.substring(0, 100)}`;
      }
    }

    return NextResponse.json({
      api_key_prefix: process.env.ANTHROPIC_API_KEY?.substring(0, 12) + "...",
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";

export async function GET(req: NextRequest) {
  const model = req.nextUrl.searchParams.get("model") || "claude-sonnet-4-5-20250514";
  try {
    const anthropic = getAnthropicClient();
    const res = await anthropic.messages.create({
      model,
      max_tokens: 10,
      messages: [{ role: "user", content: "Say OK" }],
    });
    const text = res.content.find((b) => b.type === "text");
    return NextResponse.json({ model, status: "OK", response: text?.type === "text" ? text.text : null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ model, status: "FAIL", error: msg.substring(0, 200) });
  }
}

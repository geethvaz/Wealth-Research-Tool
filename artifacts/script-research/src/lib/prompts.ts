import { eq } from "drizzle-orm";
import { getDb, promptsTable } from "./db";

// Editable AI prompts live here. Each prompt is split into three sections:
//   - role_text    (editable in admin UI) — the persona / "who is Claude"
//   - rules_text   (editable in admin UI) — the do/don't bullets
//   - output_schema (LOCKED)              — the JSON structure we parse downstream
//
// Assembly order at send-time:
//   {role_text}\n\nRules:\n{rules_text}\n\nReturn ONLY valid JSON in this exact structure:\n{output_schema}
//
// If no DB row exists for a key (first boot, DB wipe), the route falls back to
// DEFAULT_PROMPTS so the app never breaks. The admin page lazy-seeds on first load.

export interface PromptDefinition {
  key: string;
  name: string;
  role_text: string;
  rules_text: string;
  output_schema: string;
  model: string;
}

export const DEFAULT_PROMPTS: Record<string, PromptDefinition> = {
  bull_bear: {
    key: "bull_bear",
    name: "Bull / Bear / Tailwinds Thesis",
    role_text:
      "You are a senior equity research analyst at a top-tier wealth management firm. You have access to the company's actual quarterly financial data. Analyze the data carefully and generate a specific, data-driven investment thesis.",
    rules_text: [
      "Every bullet point MUST reference actual numbers, margins, growth rates, or trends from the data provided",
      "Be direct and specific — no generic statements like \"strong market position\" without data backing",
      "Reference specific quarters, YoY changes, margin trends, and absolute figures",
      "If you see declining metrics, call them out honestly in the bear case",
      "Tailwinds should be structural/industry-level drivers specific to the company's business",
    ]
      .map((r) => `- ${r}`)
      .join("\n"),
    output_schema: `{
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
}`,
    model: "claude-opus-4-7",
  },
};

export function assembleSystemPrompt(p: {
  role_text: string;
  rules_text: string;
  output_schema: string;
}): string {
  return `${p.role_text}\n\nRules:\n${p.rules_text}\n\nReturn ONLY valid JSON in this exact structure:\n${p.output_schema}`;
}

export async function loadPrompt(key: string): Promise<{
  role_text: string;
  rules_text: string;
  output_schema: string;
  model: string;
  source: "db" | "default";
}> {
  const fallback = DEFAULT_PROMPTS[key];
  if (!fallback) throw new Error(`Unknown prompt key: ${key}`);

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(promptsTable)
      .where(eq(promptsTable.key, key))
      .limit(1);
    if (rows[0]) {
      return {
        role_text: rows[0].role_text,
        rules_text: rows[0].rules_text,
        output_schema: rows[0].output_schema,
        model: rows[0].model,
        source: "db",
      };
    }
  } catch {
    // DB unavailable or table not yet created — fall through to defaults
  }

  return {
    role_text: fallback.role_text,
    rules_text: fallback.rules_text,
    output_schema: fallback.output_schema,
    model: fallback.model,
    source: "default",
  };
}

export async function ensurePromptSeeded(key: string): Promise<void> {
  const fallback = DEFAULT_PROMPTS[key];
  if (!fallback) throw new Error(`Unknown prompt key: ${key}`);

  const db = getDb();
  const rows = await db
    .select({ id: promptsTable.id })
    .from(promptsTable)
    .where(eq(promptsTable.key, key))
    .limit(1);
  if (rows[0]) return;

  await db.insert(promptsTable).values({
    key: fallback.key,
    name: fallback.name,
    role_text: fallback.role_text,
    rules_text: fallback.rules_text,
    output_schema: fallback.output_schema,
    model: fallback.model,
    updated_by: "system-seed",
  });
}


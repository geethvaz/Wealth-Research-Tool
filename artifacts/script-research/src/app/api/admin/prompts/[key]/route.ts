import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import {
  getDb,
  promptsTable,
  promptVersionsTable,
} from "@/lib/db";
import {
  DEFAULT_PROMPTS,
  assembleSystemPrompt,
  ensurePromptSeeded,
} from "@/lib/prompts";
import { requireAdmin } from "@/lib/admin-auth";

export const maxDuration = 30;

// GET current editable prompt + last 20 versions. Lazy-seeds on first call.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { key } = await params;
  if (!DEFAULT_PROMPTS[key]) {
    return NextResponse.json({ error: "Unknown prompt key" }, { status: 404 });
  }

  await ensurePromptSeeded(key);

  const db = getDb();
  const [current] = await db
    .select()
    .from(promptsTable)
    .where(eq(promptsTable.key, key))
    .limit(1);
  const versions = await db
    .select()
    .from(promptVersionsTable)
    .where(eq(promptVersionsTable.prompt_key, key))
    .orderBy(desc(promptVersionsTable.created_at))
    .limit(20);

  return NextResponse.json({
    current,
    versions,
    assembled_preview: assembleSystemPrompt(current),
    default: DEFAULT_PROMPTS[key],
  });
}

// POST saves a new version of role_text + rules_text. Guardrails:
//   - notes required (min 5 chars) — forces the editor to state why
//   - role_text and rules_text must be non-empty
//   - output_schema and model are NOT updatable via this endpoint
//   - previous state snapshotted to prompt_versions before overwrite
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

  let body: {
    role_text?: string;
    rules_text?: string;
    notes?: string;
    updated_by?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const role_text = (body.role_text ?? "").trim();
  const rules_text = (body.rules_text ?? "").trim();
  const notes = (body.notes ?? "").trim();
  const updated_by = (body.updated_by ?? "admin").trim() || "admin";

  if (!role_text) {
    return NextResponse.json(
      { error: "Role section cannot be empty" },
      { status: 400 },
    );
  }
  if (!rules_text) {
    return NextResponse.json(
      { error: "Rules section cannot be empty" },
      { status: 400 },
    );
  }
  if (notes.length < 5) {
    return NextResponse.json(
      {
        error:
          "Please add a short note (≥ 5 characters) explaining what you changed and why.",
      },
      { status: 400 },
    );
  }
  if (role_text.length > 5000 || rules_text.length > 10000) {
    return NextResponse.json(
      { error: "Prompt section too long — trim it." },
      { status: 400 },
    );
  }

  await ensurePromptSeeded(key);

  const db = getDb();
  const [existing] = await db
    .select()
    .from(promptsTable)
    .where(eq(promptsTable.key, key))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  const noChange =
    existing.role_text === role_text && existing.rules_text === rules_text;
  if (noChange) {
    return NextResponse.json(
      { error: "No changes to save — role and rules are identical." },
      { status: 400 },
    );
  }

  // Snapshot the PREVIOUS state with the note attached, then overwrite.
  await db.insert(promptVersionsTable).values({
    prompt_key: key,
    role_text: existing.role_text,
    rules_text: existing.rules_text,
    notes,
    created_by: updated_by,
  });

  await db
    .update(promptsTable)
    .set({
      role_text,
      rules_text,
      updated_at: new Date(),
      updated_by,
    })
    .where(eq(promptsTable.key, key));

  return NextResponse.json({ success: true });
}

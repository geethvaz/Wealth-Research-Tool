import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import {
  getDb,
  promptsTable,
  promptVersionsTable,
} from "@/lib/db";
import { DEFAULT_PROMPTS } from "@/lib/prompts";
import { requireAdmin } from "@/lib/admin-auth";

export const maxDuration = 30;

// POST /api/admin/prompts/:key/rollback  — body: { version_id: number }
// Restores the chosen version as current. Snapshots the current state to
// history first so rollback is itself reversible.
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
    version_id?: number;
    updated_by?: string;
  } | null;
  const versionId = body?.version_id;
  if (typeof versionId !== "number") {
    return NextResponse.json(
      { error: "version_id (number) is required" },
      { status: 400 },
    );
  }
  const updated_by = (body?.updated_by ?? "admin").trim() || "admin";

  const db = getDb();
  const [target] = await db
    .select()
    .from(promptVersionsTable)
    .where(
      and(
        eq(promptVersionsTable.id, versionId),
        eq(promptVersionsTable.prompt_key, key),
      ),
    )
    .limit(1);
  if (!target) {
    return NextResponse.json(
      { error: "Version not found for this prompt" },
      { status: 404 },
    );
  }

  const [existing] = await db
    .select()
    .from(promptsTable)
    .where(eq(promptsTable.key, key))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  // Snapshot current BEFORE overwrite.
  await db.insert(promptVersionsTable).values({
    prompt_key: key,
    role_text: existing.role_text,
    rules_text: existing.rules_text,
    notes: `Rolled back to version ${versionId}`,
    created_by: updated_by,
  });

  await db
    .update(promptsTable)
    .set({
      role_text: target.role_text,
      rules_text: target.rules_text,
      updated_at: new Date(),
      updated_by,
    })
    .where(eq(promptsTable.key, key));

  return NextResponse.json({ success: true });
}

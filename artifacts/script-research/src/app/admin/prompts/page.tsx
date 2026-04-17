"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Info,
  Lock,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";

interface PromptRow {
  id: number;
  key: string;
  name: string;
  role_text: string;
  rules_text: string;
  output_schema: string;
  model: string;
  updated_at: string;
  updated_by: string | null;
}

interface PromptVersion {
  id: number;
  prompt_key: string;
  role_text: string;
  rules_text: string;
  notes: string;
  created_at: string;
  created_by: string | null;
}

interface FetchState {
  current: PromptRow;
  versions: PromptVersion[];
  assembled_preview: string;
  default: { role_text: string; rules_text: string };
}

interface TestResult {
  ticker: string;
  name: string;
  current: { raw: string; parsed: unknown; error?: string };
  draft: { raw: string; parsed: unknown; error?: string };
}

const PROMPT_KEY = "bull_bear";

export default function AdminPromptsPage() {
  const { toast } = useToast();
  const [password, setPassword] = useState<string | null>(null);
  const [authInput, setAuthInput] = useState("");
  const [data, setData] = useState<FetchState | null>(null);
  const [loading, setLoading] = useState(false);
  const [editorName, setEditorName] = useState("");

  // Draft state (what the user is editing). Reset to current on load / discard.
  const [roleDraft, setRoleDraft] = useState("");
  const [rulesDraft, setRulesDraft] = useState("");

  // Test-run state
  const [testableCompanies, setTestableCompanies] = useState<
    { ticker: string; name: string }[]
  >([]);
  const [testTicker, setTestTicker] = useState<string>("");
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Save-modal state
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveNotes, setSaveNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Rollback-modal state
  const [rollbackTarget, setRollbackTarget] = useState<PromptVersion | null>(
    null,
  );

  // ── auth bootstrapping ────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("admin_password");
    const name = localStorage.getItem("admin_editor_name");
    if (saved) setPassword(saved);
    if (name) setEditorName(name);
  }, []);

  const authHeaders = useMemo<Record<string, string>>(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (password) h["x-admin-password"] = password;
    return h;
  }, [password]);

  const fetchData = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/prompts/${PROMPT_KEY}`, {
        headers: authHeaders,
      });
      if (res.status === 401) {
        toast({
          title: "Incorrect password",
          description: "Please try again.",
          variant: "destructive",
        });
        localStorage.removeItem("admin_password");
        setPassword(null);
        return;
      }
      if (res.status === 503) {
        const body = await res.json();
        toast({
          title: "Admin not configured",
          description: body.error,
          variant: "destructive",
        });
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as FetchState;
      setData(json);
      setRoleDraft(json.current.role_text);
      setRulesDraft(json.current.rules_text);
    } catch (e) {
      toast({
        title: "Failed to load prompt",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [password, authHeaders, toast]);

  const fetchTestable = useCallback(async () => {
    if (!password) return;
    try {
      const res = await fetch("/api/admin/testable-companies", {
        headers: authHeaders,
      });
      if (!res.ok) return;
      const json = await res.json();
      setTestableCompanies(json.companies ?? []);
      if (json.companies?.[0]?.ticker) setTestTicker(json.companies[0].ticker);
    } catch {
      /* ignore */
    }
  }, [password, authHeaders]);

  useEffect(() => {
    if (password) {
      fetchData();
      fetchTestable();
    }
  }, [password, fetchData, fetchTestable]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const submitPassword = () => {
    if (!authInput.trim()) return;
    localStorage.setItem("admin_password", authInput.trim());
    setPassword(authInput.trim());
  };

  const saveEditorName = (n: string) => {
    setEditorName(n);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_editor_name", n);
    }
  };

  const isDirty =
    !!data &&
    (roleDraft !== data.current.role_text ||
      rulesDraft !== data.current.rules_text);

  const discardChanges = () => {
    if (!data) return;
    setRoleDraft(data.current.role_text);
    setRulesDraft(data.current.rules_text);
    setTestResult(null);
  };

  const resetToDefault = () => {
    if (!data) return;
    setRoleDraft(data.default.role_text);
    setRulesDraft(data.default.rules_text);
    setTestResult(null);
  };

  const runTest = async () => {
    if (!testTicker) {
      toast({ title: "Pick a company first", variant: "destructive" });
      return;
    }
    setTestRunning(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/admin/prompts/${PROMPT_KEY}/test`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          role_text: roleDraft,
          rules_text: rulesDraft,
          ticker: testTicker,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Test failed" }));
        throw new Error(body.error ?? "Test failed");
      }
      const json = (await res.json()) as TestResult;
      setTestResult(json);
    } catch (e) {
      toast({
        title: "Test run failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setTestRunning(false);
    }
  };

  const confirmSave = async () => {
    if (!data) return;
    if (saveNotes.trim().length < 5) {
      toast({
        title: "Notes required",
        description:
          "Write a short note (at least 5 characters) explaining what changed and why.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/prompts/${PROMPT_KEY}`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          role_text: roleDraft,
          rules_text: rulesDraft,
          notes: saveNotes.trim(),
          updated_by: editorName.trim() || "admin",
        }),
      });
      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ error: "Save failed" }));
        throw new Error(body.error ?? "Save failed");
      }
      toast({ title: "Saved", description: "New prompt is now live." });
      setSaveOpen(false);
      setSaveNotes("");
      setTestResult(null);
      await fetchData();
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const doRollback = async () => {
    if (!rollbackTarget) return;
    try {
      const res = await fetch(
        `/api/admin/prompts/${PROMPT_KEY}/rollback`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            version_id: rollbackTarget.id,
            updated_by: editorName.trim() || "admin",
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Rollback failed" }));
        throw new Error(body.error ?? "Rollback failed");
      }
      toast({
        title: "Rolled back",
        description: `Prompt restored to version from ${new Date(
          rollbackTarget.created_at,
        ).toLocaleString()}.`,
      });
      setRollbackTarget(null);
      await fetchData();
    } catch (e) {
      toast({
        title: "Rollback failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  if (!password) {
    return (
      <Layout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-teal-600" />
                Admin access
              </CardTitle>
              <CardDescription>
                Enter the admin password to edit AI prompts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="Admin password"
                value={authInput}
                onChange={(e) => setAuthInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitPassword()}
              />
              <Button onClick={submitPassword} className="w-full">
                Sign in
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl p-6 space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Prompt Editor</h1>
            <p className="text-sm text-slate-500">
              Refine how Claude writes the Bull / Bear thesis. Changes go live
              immediately.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem("admin_password");
              setPassword(null);
            }}
          >
            Sign out
          </Button>
        </header>

        {loading && !data ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !data ? null : (
          <>
            {/* Guidance banner */}
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
              <CardContent className="flex gap-3 pt-6 text-sm">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-900 dark:text-amber-200">
                    Small, deliberate changes beat big rewrites.
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-amber-900/90 dark:text-amber-200/90">
                    <li>
                      Change <strong>one thing at a time</strong> so you can
                      tell what helped.
                    </li>
                    <li>
                      Always <strong>Run Test</strong> on a real company before
                      saving — it runs the old prompt and the new one
                      side-by-side.
                    </li>
                    <li>
                      You can always <strong>roll back</strong> from version
                      history below if something regresses.
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardContent className="flex flex-wrap items-center gap-4 pt-6 text-sm">
                <Badge variant="outline">{data.current.name}</Badge>
                <span className="text-slate-500">
                  Model:{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
                    {data.current.model}
                  </code>
                </span>
                <span className="text-slate-500">
                  Last edited:{" "}
                  {new Date(data.current.updated_at).toLocaleString()}
                  {data.current.updated_by
                    ? ` by ${data.current.updated_by}`
                    : ""}
                </span>
              </CardContent>
            </Card>

            {/* Editor name */}
            <div className="max-w-md">
              <Label htmlFor="editor-name">Your name</Label>
              <Input
                id="editor-name"
                placeholder="e.g. Geeth"
                value={editorName}
                onChange={(e) => saveEditorName(e.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-slate-500">
                Stamped on every save so you can tell who changed what.
              </p>
            </div>

            {/* Role */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Role & Persona</CardTitle>
                <CardDescription>
                  Who is Claude pretending to be? One short paragraph. Example:
                  &ldquo;You are a senior equity research analyst at a top-tier
                  wealth management firm.&rdquo;
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  className="min-h-[120px] font-mono text-sm"
                  value={roleDraft}
                  onChange={(e) => setRoleDraft(e.target.value)}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{roleDraft.length} / 5000 characters</span>
                  {roleDraft !== data.current.role_text && (
                    <span className="text-amber-600">Unsaved</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Rules</CardTitle>
                <CardDescription>
                  Do/don&rsquo;t bullets. One rule per line, starting with{" "}
                  <code>- </code>. Be specific — vague rules produce vague
                  output. Good: &ldquo;Cite the quarter for every number.&rdquo;
                  Bad: &ldquo;Be thorough.&rdquo;
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  className="min-h-[200px] font-mono text-sm"
                  value={rulesDraft}
                  onChange={(e) => setRulesDraft(e.target.value)}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{rulesDraft.length} / 10000 characters</span>
                  {rulesDraft !== data.current.rules_text && (
                    <span className="text-amber-600">Unsaved</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Locked output schema */}
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-4 w-4 text-slate-400" />
                  3. Output structure{" "}
                  <Badge variant="secondary">Locked</Badge>
                </CardTitle>
                <CardDescription>
                  Claude must return this exact JSON shape so the app can
                  display it. Editing this would break the Bull/Bear tab — so
                  it&rsquo;s read-only. If you genuinely need a different
                  structure, ping your dev.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[200px] overflow-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-900">
                  {data.current.output_schema}
                </pre>
              </CardContent>
            </Card>

            {/* Test run */}
            <Card className="border-teal-200 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-teal-600" />
                  Run a test before saving
                </CardTitle>
                <CardDescription>
                  We&rsquo;ll run both the <strong>current saved prompt</strong>{" "}
                  and your <strong>draft</strong> on the same company and show
                  you the outputs side-by-side. Uses Claude API credits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[220px]">
                    <Label htmlFor="test-company">Company</Label>
                    <Select value={testTicker} onValueChange={setTestTicker}>
                      <SelectTrigger id="test-company" className="mt-1">
                        <SelectValue placeholder="Pick a company" />
                      </SelectTrigger>
                      <SelectContent>
                        {testableCompanies.map((c) => (
                          <SelectItem key={c.ticker} value={c.ticker}>
                            {c.ticker} — {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={runTest}
                    disabled={testRunning || !testTicker}
                  >
                    {testRunning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Running…
                      </>
                    ) : (
                      "Run Test"
                    )}
                  </Button>
                </div>
                {testResult && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <TestOutput
                      title="Current (saved)"
                      result={testResult.current}
                    />
                    <TestOutput
                      title="Draft (your edits)"
                      result={testResult.draft}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save bar */}
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Info className="h-4 w-4" />
                  {isDirty
                    ? "You have unsaved changes."
                    : "No changes yet."}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={resetToDefault}
                    disabled={saving}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Reset to default
                  </Button>
                  <Button
                    variant="outline"
                    onClick={discardChanges}
                    disabled={!isDirty || saving}
                  >
                    <Undo2 className="mr-2 h-4 w-4" /> Discard
                  </Button>
                  <Button
                    onClick={() => setSaveOpen(true)}
                    disabled={!isDirty || saving}
                  >
                    <Save className="mr-2 h-4 w-4" /> Save changes
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Version history */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Version history</CardTitle>
                <CardDescription>
                  Each save snapshots the{" "}
                  <strong>previous version</strong>. You can restore any of
                  them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.versions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No previous versions yet — this is the original.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.versions.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-start justify-between rounded-lg border p-3 text-sm"
                      >
                        <div className="flex-1 space-y-1 pr-4">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>
                              {new Date(v.created_at).toLocaleString()}
                            </span>
                            {v.created_by && (
                              <>
                                <span>•</span>
                                <span>{v.created_by}</span>
                              </>
                            )}
                          </div>
                          <div className="text-slate-800 dark:text-slate-200">
                            {v.notes}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRollbackTarget(v)}
                        >
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Save dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save changes</DialogTitle>
            <DialogDescription>
              Write a short note so future-you knows why you changed it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="save-notes">
                What did you change and why?{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="save-notes"
                placeholder='e.g. "Added rule to always mention segment mix; prior output was too focused on total revenue."'
                value={saveNotes}
                onChange={(e) => setSaveNotes(e.target.value)}
                className="mt-1 min-h-[90px]"
              />
            </div>
            {!testResult && (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>
                  You haven&rsquo;t run a test yet. Consider closing this and
                  clicking <strong>Run Test</strong> first — it&rsquo;s quick.
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={confirmSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" /> Confirm save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback dialog */}
      <Dialog
        open={!!rollbackTarget}
        onOpenChange={(open) => !open && setRollbackTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore this version?</DialogTitle>
            <DialogDescription>
              The current prompt will be snapshotted first, so this is
              reversible.
            </DialogDescription>
          </DialogHeader>
          {rollbackTarget && (
            <div className="max-h-[50vh] space-y-3 overflow-auto text-sm">
              <div>
                <div className="text-xs text-slate-500">Role</div>
                <pre className="whitespace-pre-wrap rounded bg-slate-100 p-2 text-xs dark:bg-slate-900">
                  {rollbackTarget.role_text}
                </pre>
              </div>
              <div>
                <div className="text-xs text-slate-500">Rules</div>
                <pre className="whitespace-pre-wrap rounded bg-slate-100 p-2 text-xs dark:bg-slate-900">
                  {rollbackTarget.rules_text}
                </pre>
              </div>
              <div className="text-xs text-slate-500">
                Original note: {rollbackTarget.notes}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackTarget(null)}>
              Cancel
            </Button>
            <Button onClick={doRollback}>Restore</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function TestOutput({
  title,
  result,
}: {
  title: string;
  result: { raw: string; parsed: unknown; error?: string };
}) {
  const parsed = result.parsed as {
    bull_case?: string[];
    bear_case?: string[];
    tailwinds?: string[];
    headwinds?: string[];
    watchlist_metrics?: string[];
  } | null;
  return (
    <div className="rounded-lg border bg-white p-4 dark:bg-slate-950">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {result.error && (
        <div className="mb-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {result.error}
        </div>
      )}
      {parsed ? (
        <div className="space-y-3 text-xs">
          <Section title="Bull" items={parsed.bull_case} tone="emerald" />
          <Section title="Bear" items={parsed.bear_case} tone="rose" />
          <Section title="Tailwinds" items={parsed.tailwinds} tone="sky" />
          <Section title="Headwinds" items={parsed.headwinds} tone="amber" />
          <Section
            title="Watchlist metrics"
            items={parsed.watchlist_metrics}
            tone="slate"
          />
        </div>
      ) : (
        <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap text-xs">
          {result.raw || "(empty)"}
        </pre>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  tone,
}: {
  title: string;
  items?: string[];
  tone: "emerald" | "rose" | "sky" | "amber" | "slate";
}) {
  if (!items || items.length === 0) return null;
  const toneCls = {
    emerald: "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40",
    rose: "border-rose-200 bg-rose-50 dark:bg-rose-950/40",
    sky: "border-sky-200 bg-sky-50 dark:bg-sky-950/40",
    amber: "border-amber-200 bg-amber-50 dark:bg-amber-950/40",
    slate: "border-slate-200 bg-slate-50 dark:bg-slate-900",
  }[tone];
  return (
    <div className={`rounded border p-2 ${toneCls}`}>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
        {title}
      </div>
      <ul className="list-disc space-y-1 pl-4">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

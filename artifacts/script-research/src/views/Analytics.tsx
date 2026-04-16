"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  ZAxis,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────

interface CoreData {
  income_statement?: Record<string, Record<string, number>>;
  cash_flow?: Record<string, Record<string, number>>;
  valuation?: Record<string, Record<string, number>>;
  quarters?: string[];
}

interface Company {
  id: number;
  ticker: string;
  name: string;
  exchange: string | null;
  company_type: string | null;
  status: "current" | "needs_update";
  last_updated: string | null;
  created_at: string;
  core_data: CoreData | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const TYPE_DOT_COLORS: Record<string, string> = {
  software: "#8b5cf6",
  banking: "#3b82f6",
  financials: "#6366f1",
  internet: "#06b6d4",
};

const TYPE_LINE_COLORS: string[] = [
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#a855f7",
  "#64748b",
];

function getLastVal(series: Record<string, number> | undefined): number | null {
  if (!series) return null;
  const vals = Object.values(series);
  return vals.length > 0 ? vals[vals.length - 1] : null;
}

function getRevGrowthYoY(series: Record<string, number> | undefined): number | null {
  if (!series) return null;
  const vals = Object.values(series);
  if (vals.length < 5) return null;
  const current = vals[vals.length - 1];
  const yearAgo = vals[vals.length - 5];
  if (!yearAgo || yearAgo === 0) return null;
  return (current - yearAgo) / Math.abs(yearAgo);
}

function computeTTM(series: Record<string, number> | undefined): number | null {
  if (!series) return null;
  const vals = Object.values(series);
  if (vals.length < 4) return null;
  const last4 = vals.slice(-4);
  return last4.reduce((a, b) => a + b, 0);
}

function fmtB(val: number | null): string {
  if (val === null) return "\u2014";
  const abs = Math.abs(val);
  if (abs >= 1000) return `$${(val / 1000).toFixed(1)}B`;
  return `$${val.toFixed(0)}M`;
}

function fmtPct(val: number | null): string {
  if (val === null) return "\u2014";
  return `${(val * 100).toFixed(1)}%`;
}

function fmtRatio(val: number | null): string {
  if (val === null) return "\u2014";
  return `${val.toFixed(1)}x`;
}

// ── Heat map color helper ──────────────────────────────────────────────────

type HeatLevel = "top" | "mid" | "bottom" | "none";

function getQuartile(value: number | null, allValues: (number | null)[], lowerIsBetter: boolean): HeatLevel {
  if (value === null) return "none";
  const valid = allValues.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (valid.length < 2) return "mid";
  const idx = valid.indexOf(value);
  const pct = idx / (valid.length - 1);
  if (lowerIsBetter) {
    if (pct <= 0.25) return "top";
    if (pct >= 0.75) return "bottom";
    return "mid";
  }
  if (pct >= 0.75) return "top";
  if (pct <= 0.25) return "bottom";
  return "mid";
}

const HEAT_BG: Record<HeatLevel, string> = {
  top: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300",
  mid: "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300",
  bottom: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  none: "text-slate-400 dark:text-slate-500",
};

// ── Scatter tooltip ────────────────────────────────────────────────────────

interface ScatterPayload {
  ticker: string;
  revGrowth: number;
  pe: number;
  revenue: number;
}

function ScatterTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterPayload }> }) {
  if (!active || !payload || !payload[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-bold text-slate-900 dark:text-white">{d.ticker}</p>
      <p className="text-slate-600 dark:text-slate-300">Rev Growth: {fmtPct(d.revGrowth)}</p>
      <p className="text-slate-600 dark:text-slate-300">P/E: {fmtRatio(d.pe)}</p>
      <p className="text-slate-600 dark:text-slate-300">Revenue: {fmtB(d.revenue)}</p>
    </div>
  );
}

// ── Custom scatter label ───────────────────────────────────────────────────

interface LabelProps {
  x?: number;
  y?: number;
  value?: string;
}

function renderScatterLabel({ x, y, value }: LabelProps) {
  return (
    <text x={(x ?? 0) + 8} y={(y ?? 0) - 8} fontSize={11} fill="#64748b" fontWeight={600}>
      {value}
    </text>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function Analytics() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const generateSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    setSummaryText(null);
    try {
      const res = await fetch("/api/portfolio-summary", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSummaryText(data.summary);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchCompanies = useCallback(() => {
    fetch("/api/companies")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Company[]>;
      })
      .then((data) => {
        setCompanies(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Only companies with core_data
  const dataCompanies = useMemo(() => companies.filter((c) => c.core_data), [companies]);

  // ── Computed metrics per company ───────────────────────────────────────

  const metrics = useMemo(() => {
    return dataCompanies.map((c) => {
      const cd = c.core_data!;
      const revTTM = computeTTM(cd.income_statement?.revenue);
      const revGrowth = getRevGrowthYoY(cd.income_statement?.revenue);
      const grossMargin = getLastVal(cd.income_statement?.gross_margin);
      const ebitMargin = getLastVal(cd.income_statement?.operating_margin);
      const netMargin = getLastVal(cd.income_statement?.net_margin);
      const pe = getLastVal(cd.valuation?.pe);
      const evEbitda = getLastVal(cd.valuation?.ev_ebitda);
      const roe = getLastVal(cd.valuation?.roe);
      const lastFcf = getLastVal(cd.cash_flow?.fcf);
      const lastMktCap = getLastVal(cd.valuation?.market_cap);
      const fcfYield =
        lastFcf !== null && lastMktCap !== null && lastMktCap !== 0
          ? lastFcf / lastMktCap
          : null;
      const lastRev = getLastVal(cd.income_statement?.revenue);

      return {
        ticker: c.ticker,
        name: c.name,
        companyType: c.company_type?.toLowerCase() ?? "",
        revTTM,
        revGrowth,
        grossMargin,
        ebitMargin,
        netMargin,
        pe,
        evEbitda,
        roe,
        fcfYield,
        revenue: lastRev,
      };
    });
  }, [dataCompanies]);

  // ── Scatter data ───────────────────────────────────────────────────────

  const scatterData = useMemo(() => {
    return metrics
      .filter((m) => m.revGrowth !== null && m.pe !== null && m.pe > 0)
      .map((m) => ({
        ticker: m.ticker,
        revGrowth: m.revGrowth!,
        pe: m.pe!,
        revenue: m.revenue ?? 100,
        companyType: m.companyType,
      }));
  }, [metrics]);

  // ── Margin trend data ──────────────────────────────────────────────────

  const marginTrendData = useMemo(() => {
    // Collect all quarters across companies
    const allQuarters = new Set<string>();
    dataCompanies.forEach((c) => {
      const cd = c.core_data!;
      const series = cd.income_statement?.gross_margin ?? cd.income_statement?.operating_margin;
      if (series) {
        Object.keys(series).forEach((q) => allQuarters.add(q));
      }
    });
    const sortedQuarters = Array.from(allQuarters).sort();
    // Only last 12 quarters
    const last12 = sortedQuarters.slice(-12);

    return last12.map((q) => {
      const point: Record<string, string | number | null> = { quarter: q };
      dataCompanies.forEach((c) => {
        const cd = c.core_data!;
        const series = cd.income_statement?.gross_margin ?? cd.income_statement?.operating_margin;
        const val = series?.[q] ?? null;
        point[c.ticker] = val !== null ? parseFloat((val * 100).toFixed(1)) : null;
      });
      return point;
    });
  }, [dataCompanies]);

  // ── Ranking data ───────────────────────────────────────────────────────

  const cheapest = useMemo(() => {
    return [...metrics]
      .filter((m) => m.pe !== null && m.pe > 0)
      .sort((a, b) => a.pe! - b.pe!)
      .slice(0, 5);
  }, [metrics]);

  const fastestGrowing = useMemo(() => {
    return [...metrics]
      .filter((m) => m.revGrowth !== null)
      .sort((a, b) => b.revGrowth! - a.revGrowth!)
      .slice(0, 5);
  }, [metrics]);

  const highestQuality = useMemo(() => {
    return [...metrics]
      .filter((m) => m.roe !== null)
      .sort((a, b) => b.roe! - a.roe!)
      .slice(0, 5);
  }, [metrics]);

  // ── Heat map columns ──────────────────────────────────────────────────

  type MetricCol = {
    key: keyof (typeof metrics)[0];
    label: string;
    fmt: (v: number | null) => string;
    lowerIsBetter: boolean;
  };

  const heatCols: MetricCol[] = [
    { key: "revTTM", label: "Rev TTM", fmt: fmtB, lowerIsBetter: false },
    { key: "revGrowth", label: "Rev Growth", fmt: fmtPct, lowerIsBetter: false },
    { key: "grossMargin", label: "Gross Margin", fmt: fmtPct, lowerIsBetter: false },
    { key: "ebitMargin", label: "EBIT Margin", fmt: fmtPct, lowerIsBetter: false },
    { key: "netMargin", label: "Net Margin", fmt: fmtPct, lowerIsBetter: false },
    { key: "pe", label: "P/E", fmt: fmtRatio, lowerIsBetter: true },
    { key: "evEbitda", label: "EV/EBITDA", fmt: fmtRatio, lowerIsBetter: true },
    { key: "roe", label: "ROE", fmt: fmtPct, lowerIsBetter: false },
    { key: "fcfYield", label: "FCF Yield", fmt: fmtPct, lowerIsBetter: false },
  ];

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Layout>
        <div className="p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-48 rounded" />
            <Skeleton className="h-4 w-80 mt-2 rounded" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800">
                <CardContent className="p-6">
                  <Skeleton className="h-64 w-full rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800/50 p-4 text-sm text-red-700 dark:text-red-400">
            Failed to load companies: {error}
          </div>
        </div>
      </Layout>
    );
  }

  if (dataCompanies.length < 2) {
    return (
      <Layout>
        <div className="p-6 lg:p-8 max-w-[1400px] w-full mx-auto" data-testid="page-analytics">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Analytics</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Cross-company comparison and portfolio analytics
            </p>
          </div>
          <Card className="rounded-xl border-dashed border-2 border-slate-300 dark:border-slate-700 shadow-none">
            <CardContent className="py-16 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Need more data
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                Upload at least 2 companies with built Core Sheets to unlock analytics. Currently tracking {dataCompanies.length} company with data.
              </p>
              <Button
                className="bg-[#0D9488] hover:bg-teal-700 text-white rounded-xl shadow-sm transition-all duration-150 h-10 px-6"
                onClick={() => router.push("/upload")}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-[1400px] w-full mx-auto" data-testid="page-analytics">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Analytics
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Cross-company comparison across {dataCompanies.length} companies in your coverage universe
            </p>
          </div>
          <Button
            className="bg-[#0D9488] hover:bg-teal-700 text-white rounded-xl shadow-sm transition-all duration-150 h-10 px-5"
            onClick={generateSummary}
            disabled={summaryLoading}
          >
            {summaryLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {summaryLoading ? "Generating..." : "Generate Portfolio Brief"}
          </Button>
        </div>

        {/* Portfolio Summary */}
        {summaryError && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800/50 p-4 mb-6 text-sm text-red-700 dark:text-red-400">
            {summaryError}
          </div>
        )}
        {summaryText && (
          <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-[#0D9488]" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Portfolio Brief</h2>
              </div>
              <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                {summaryText.split("\n\n").map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 1: Valuation Scatter Plot */}
        <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800 mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              Growth vs. Value
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Revenue growth (YoY) vs. P/E ratio -- spot undervalued growers in the bottom-right quadrant
            </p>
            {scatterData.length < 2 ? (
              <p className="text-sm text-slate-400 py-12 text-center">
                Not enough companies with both revenue growth and P/E data to render this chart.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="revGrowth"
                    type="number"
                    name="Rev Growth"
                    tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                    label={{ value: "Revenue Growth YoY", position: "bottom", offset: 0, style: { fontSize: 12, fill: "#64748b" } }}
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="pe"
                    type="number"
                    name="P/E"
                    tickFormatter={(v: number) => `${v.toFixed(0)}x`}
                    label={{ value: "P/E Ratio", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 12, fill: "#64748b" } }}
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                  />
                  <ZAxis dataKey="revenue" range={[60, 400]} name="Revenue" />
                  <Tooltip content={<ScatterTooltipContent />} />
                  <Scatter data={scatterData} label={renderScatterLabel} name="Companies">
                    {scatterData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={TYPE_DOT_COLORS[entry.companyType] ?? "#64748b"}
                        fillOpacity={0.8}
                        stroke={TYPE_DOT_COLORS[entry.companyType] ?? "#64748b"}
                        strokeWidth={1}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Metric Heat Map */}
        <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800 mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              Metric Heat Map
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Green = top quartile, yellow = middle, red = bottom quartile relative to coverage
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 px-3 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 sticky left-0 bg-white dark:bg-slate-950 z-10">
                      Ticker
                    </th>
                    {heatCols.map((col) => (
                      <th
                        key={col.key}
                        className="text-right py-2 px-3 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m, rowIdx) => (
                    <tr
                      key={m.ticker}
                      className={`border-b border-slate-100 dark:border-slate-800/50 ${
                        rowIdx % 2 !== 0 ? "bg-slate-50/40 dark:bg-slate-900/20" : ""
                      }`}
                    >
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white sticky left-0 bg-inherit z-10">
                        {m.ticker}
                      </td>
                      {heatCols.map((col) => {
                        const val = m[col.key] as number | null;
                        const allVals = metrics.map((x) => x[col.key] as number | null);
                        const level = getQuartile(val, allVals, col.lowerIsBetter);
                        return (
                          <td
                            key={col.key}
                            className={`text-right py-2 px-3 font-mono text-xs tabular-nums rounded ${HEAT_BG[level]}`}
                          >
                            {col.fmt(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Ranking Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <RankingCard
            title="Cheapest"
            subtitle="By P/E (ascending)"
            items={cheapest}
            valueKey="pe"
            fmt={fmtRatio}
            accentColor="bg-emerald-500"
          />
          <RankingCard
            title="Fastest Growing"
            subtitle="By revenue growth (descending)"
            items={fastestGrowing}
            valueKey="revGrowth"
            fmt={fmtPct}
            accentColor="bg-violet-500"
          />
          <RankingCard
            title="Highest Quality"
            subtitle="By ROE (descending)"
            items={highestQuality}
            valueKey="roe"
            fmt={fmtPct}
            accentColor="bg-blue-500"
          />
        </div>

        {/* Section 4: Margin Trend Comparison */}
        <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800 mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              Margin Trend Comparison
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Gross margin (or operating margin) over the last 12 quarters
            </p>
            {marginTrendData.length < 2 ? (
              <p className="text-sm text-slate-400 py-12 text-center">
                Not enough quarterly data to render margin trends.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <LineChart data={marginTrendData} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="quarter"
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${v}%`}
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                    label={{ value: "Margin %", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 12, fill: "#64748b" } }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`]}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  {dataCompanies.map((c, idx) => (
                    <Line
                      key={c.ticker}
                      type="monotone"
                      dataKey={c.ticker}
                      stroke={TYPE_LINE_COLORS[idx % TYPE_LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

// ── Ranking Card ───────────────────────────────────────────────────────────

interface RankingItem {
  ticker: string;
  [key: string]: number | string | null;
}

function RankingCard({
  title,
  subtitle,
  items,
  valueKey,
  fmt,
  accentColor,
}: {
  title: string;
  subtitle: string;
  items: RankingItem[];
  valueKey: string;
  fmt: (v: number | null) => string;
  accentColor: string;
}) {
  if (items.length === 0) {
    return (
      <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{subtitle}</p>
          <p className="text-sm text-slate-400 text-center py-4">No data</p>
        </CardContent>
      </Card>
    );
  }

  // Compute max absolute value for bar width
  const values = items.map((i) => Math.abs((i[valueKey] as number) ?? 0));
  const maxVal = Math.max(...values, 0.001);

  return (
    <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800">
      <CardContent className="p-5">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{subtitle}</p>
        <div className="space-y-3">
          {items.map((item, idx) => {
            const val = item[valueKey] as number | null;
            const barWidth = val !== null ? (Math.abs(val) / maxVal) * 100 : 0;
            return (
              <div key={item.ticker} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-5 text-right">{idx + 1}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white w-16">{item.ticker}</span>
                <div className="flex-1 relative h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 ${accentColor} rounded-full opacity-20`}
                    style={{ width: `${Math.min(barWidth, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-300 tabular-nums w-16 text-right">
                  {fmt(val)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

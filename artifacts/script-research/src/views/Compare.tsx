"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeftRight } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CoreData {
  income_statement?: Record<string, Record<string, number>>;
  cash_flow?: Record<string, Record<string, number>>;
  balance_sheet?: Record<string, Record<string, number>>;
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

// ─── Formatting helpers (matching Dashboard) ───────────────────────────────

function getLastVal(series: Record<string, number> | undefined): number | null {
  if (!series) return null;
  const vals = Object.values(series);
  return vals.length > 0 ? vals[vals.length - 1] : null;
}

function fmtB(val: number | null): string {
  if (val === null) return "\u2014";
  const abs = Math.abs(val);
  if (abs >= 1000) return `$${(val / 1000).toFixed(1)}B`;
  return `$${val.toFixed(1)}M`;
}

function fmtPct(val: number | null): string {
  if (val === null) return "\u2014";
  return `${(val * 100).toFixed(1)}%`;
}

function fmtRatio(val: number | null): string {
  if (val === null) return "\u2014";
  return `${val.toFixed(1)}x`;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const COMPANY_COLORS = ["#0D9488", "#6366F1", "#F59E0B", "#EF4444"];

const TYPE_COLORS: Record<string, string> = {
  software: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  banking: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  financials: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  internet: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

type MetricDef = {
  label: string;
  getValue: (c: Company) => number | null;
  format: (v: number | null) => string;
  higherIsBetter: boolean;
};

const METRIC_GROUPS: { group: string; metrics: MetricDef[] }[] = [
  {
    group: "Income",
    metrics: [
      { label: "Revenue", getValue: (c) => getLastVal(c.core_data?.income_statement?.revenue), format: fmtB, higherIsBetter: true },
      { label: "Gross Margin", getValue: (c) => getLastVal(c.core_data?.income_statement?.gross_margin), format: fmtPct, higherIsBetter: true },
      { label: "EBIT Margin", getValue: (c) => getLastVal(c.core_data?.income_statement?.operating_margin), format: fmtPct, higherIsBetter: true },
      { label: "Net Margin", getValue: (c) => getLastVal(c.core_data?.income_statement?.net_margin), format: fmtPct, higherIsBetter: true },
      { label: "EPS", getValue: (c) => getLastVal(c.core_data?.income_statement?.eps), format: (v) => v === null ? "\u2014" : `$${v.toFixed(2)}`, higherIsBetter: true },
    ],
  },
  {
    group: "Cash Flow",
    metrics: [
      { label: "OCF", getValue: (c) => getLastVal(c.core_data?.cash_flow?.ocf), format: fmtB, higherIsBetter: true },
      { label: "FCF", getValue: (c) => getLastVal(c.core_data?.cash_flow?.fcf), format: fmtB, higherIsBetter: true },
      {
        label: "FCF Yield",
        getValue: (c) => {
          const fcf = getLastVal(c.core_data?.cash_flow?.fcf);
          const mktCap = getLastVal(c.core_data?.valuation?.market_cap);
          if (fcf === null || mktCap === null || mktCap === 0) return null;
          return fcf / mktCap;
        },
        format: fmtPct,
        higherIsBetter: true,
      },
    ],
  },
  {
    group: "Valuation",
    metrics: [
      { label: "P/E", getValue: (c) => getLastVal(c.core_data?.valuation?.pe), format: fmtRatio, higherIsBetter: false },
      { label: "EV/EBITDA", getValue: (c) => getLastVal(c.core_data?.valuation?.ev_ebitda), format: fmtRatio, higherIsBetter: false },
      { label: "EV/Revenue", getValue: (c) => getLastVal(c.core_data?.valuation?.ev_revenue), format: fmtRatio, higherIsBetter: false },
      { label: "P/B", getValue: (c) => getLastVal(c.core_data?.valuation?.pb), format: fmtRatio, higherIsBetter: false },
    ],
  },
  {
    group: "Returns",
    metrics: [
      { label: "ROE", getValue: (c) => getLastVal(c.core_data?.valuation?.roe), format: fmtPct, higherIsBetter: true },
      { label: "ROA", getValue: (c) => getLastVal(c.core_data?.valuation?.roa), format: fmtPct, higherIsBetter: true },
      { label: "ROIC", getValue: (c) => getLastVal(c.core_data?.valuation?.roic), format: fmtPct, higherIsBetter: true },
    ],
  },
  {
    group: "Balance Sheet",
    metrics: [
      { label: "Total Assets", getValue: (c) => getLastVal(c.core_data?.balance_sheet?.total_assets), format: fmtB, higherIsBetter: true },
      { label: "Total Debt", getValue: (c) => getLastVal(c.core_data?.balance_sheet?.total_debt), format: fmtB, higherIsBetter: false },
      { label: "Equity", getValue: (c) => getLastVal(c.core_data?.balance_sheet?.total_equity), format: fmtB, higherIsBetter: true },
    ],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

export function Compare() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);

  useEffect(() => {
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

  const toggleTicker = (ticker: string) => {
    setSelectedTickers((prev) => {
      if (prev.includes(ticker)) return prev.filter((t) => t !== ticker);
      if (prev.length >= 4) return prev;
      return [...prev, ticker];
    });
  };

  const selected = useMemo(
    () => companies.filter((c) => selectedTickers.includes(c.ticker)),
    [companies, selectedTickers],
  );

  const canCompare = selected.length >= 2;

  // ─── Revenue Trend Data (last 8 quarters) ──────────────────────────────

  const revenueTrendData = useMemo(() => {
    if (!canCompare) return [];

    // Collect all quarter labels across selected companies
    const allQuarters = new Set<string>();
    selected.forEach((c) => {
      const revSeries = c.core_data?.income_statement?.revenue;
      if (revSeries) {
        Object.keys(revSeries).forEach((q) => allQuarters.add(q));
      }
    });

    const sortedQuarters = Array.from(allQuarters).sort().slice(-8);

    return sortedQuarters.map((q) => {
      const point: Record<string, string | number | null> = { quarter: q };
      selected.forEach((c) => {
        const val = c.core_data?.income_statement?.revenue?.[q] ?? null;
        point[c.ticker] = val;
      });
      return point;
    });
  }, [selected, canCompare]);

  // ─── Margin Comparison Data ────────────────────────────────────────────

  const marginCompData = useMemo(() => {
    if (!canCompare) return [];

    const marginMetrics = [
      { label: "Gross Margin", key: "gross_margin" },
      { label: "EBIT Margin", key: "operating_margin" },
      { label: "Net Margin", key: "net_margin" },
    ];

    return marginMetrics.map((m) => {
      const point: Record<string, string | number | null> = { metric: m.label };
      selected.forEach((c) => {
        const val = getLastVal(
          c.core_data?.income_statement?.[m.key] as Record<string, number> | undefined,
        );
        point[c.ticker] = val !== null ? Math.round(val * 1000) / 10 : null;
      });
      return point;
    });
  }, [selected, canCompare]);

  // ─── Find best value in a row ──────────────────────────────────────────

  function getBestTicker(metric: MetricDef): string | null {
    if (selected.length < 2) return null;
    let bestTicker: string | null = null;
    let bestVal: number | null = null;
    selected.forEach((c) => {
      const val = metric.getValue(c);
      if (val === null) return;
      if (bestVal === null) {
        bestVal = val;
        bestTicker = c.ticker;
      } else if (metric.higherIsBetter ? val > bestVal : val < bestVal) {
        bestVal = val;
        bestTicker = c.ticker;
      }
    });
    return bestTicker;
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-[1400px] w-full mx-auto" data-testid="page-compare">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Peer Comparison
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Select 2-4 companies to compare side by side
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800/50 p-4 mb-6 text-sm text-red-700 dark:text-red-400">
            Failed to load companies: {error}
          </div>
        )}

        {/* Company Picker */}
        <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800 mb-8">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Select Companies ({selectedTickers.length}/4)
            </p>
            {loading ? (
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {companies.map((c) => {
                  const isSelected = selectedTickers.includes(c.ticker);
                  const isDisabled = !isSelected && selectedTickers.length >= 4;
                  return (
                    <button
                      key={c.ticker}
                      onClick={() => toggleTicker(c.ticker)}
                      disabled={isDisabled}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
                        isSelected
                          ? "bg-[#0D9488] text-white border-[#0D9488] shadow-sm"
                          : isDisabled
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700"
                            : "bg-white text-slate-700 border-slate-200 hover:border-[#0D9488] hover:text-[#0D9488] dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:border-[#0D9488]"
                      }`}
                    >
                      {c.ticker}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prompt to select */}
        {!canCompare && !loading && (
          <Card className="rounded-xl border-dashed border-2 border-slate-300 dark:border-slate-700 shadow-none">
            <CardContent className="py-16 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <ArrowLeftRight className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Select at least 2 companies
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                Pick 2 to 4 companies from the chips above to see a detailed side-by-side comparison of financials, valuation, and performance.
              </p>
            </CardContent>
          </Card>
        )}

        {canCompare && (
          <>
            {/* Section 1: Summary Cards */}
            <div className={`grid gap-4 mb-8 ${selected.length === 2 ? "grid-cols-2" : selected.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
              {selected.map((c, idx) => {
                const cd = c.core_data;
                const rev = getLastVal(cd?.income_statement?.revenue);
                const pe = getLastVal(cd?.valuation?.pe);
                const roe = getLastVal(cd?.valuation?.roe);
                const netMargin = getLastVal(cd?.income_statement?.net_margin);
                const typeColor = TYPE_COLORS[c.company_type?.toLowerCase() ?? ""] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";

                return (
                  <Card
                    key={c.ticker}
                    className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800"
                    style={{ borderTopColor: COMPANY_COLORS[idx], borderTopWidth: 3 }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {c.ticker}
                        </span>
                        {c.company_type && (
                          <Badge
                            variant="outline"
                            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold border-0 uppercase tracking-wide ${typeColor}`}
                          >
                            {c.company_type}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 truncate">
                        {c.name}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Revenue</span>
                          <span className="font-mono font-medium text-slate-900 dark:text-white tabular-nums">{fmtB(rev)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">P/E</span>
                          <span className="font-mono font-medium text-slate-900 dark:text-white tabular-nums">{fmtRatio(pe)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">ROE</span>
                          <span className="font-mono font-medium text-slate-900 dark:text-white tabular-nums">{fmtPct(roe)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Net Margin</span>
                          <span className="font-mono font-medium text-slate-900 dark:text-white tabular-nums">{fmtPct(netMargin)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Section 2: Metric-by-Metric Comparison Table */}
            <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800 mb-8 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
                      <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Metric
                      </th>
                      {selected.map((c, idx) => (
                        <th
                          key={c.ticker}
                          className="text-right px-5 py-3 font-semibold text-xs uppercase tracking-wider"
                          style={{ color: COMPANY_COLORS[idx] }}
                        >
                          {c.ticker}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {METRIC_GROUPS.map((group) => (
                      <React.Fragment key={group.group}>
                        {/* Group header row */}
                        <tr className="bg-slate-100/70 dark:bg-slate-800/50">
                          <td
                            colSpan={selected.length + 1}
                            className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                          >
                            {group.group}
                          </td>
                        </tr>
                        {group.metrics.map((metric, mIdx) => {
                          const bestTicker = getBestTicker(metric);
                          return (
                            <tr
                              key={metric.label}
                              className={`border-b border-slate-100 dark:border-slate-800/50 ${
                                mIdx % 2 !== 0 ? "bg-slate-50/40 dark:bg-slate-900/20" : ""
                              }`}
                            >
                              <td className="px-5 py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                                {metric.label}
                              </td>
                              {selected.map((c) => {
                                const val = metric.getValue(c);
                                const isBest = c.ticker === bestTicker;
                                return (
                                  <td
                                    key={c.ticker}
                                    className={`px-5 py-2.5 text-right font-mono tabular-nums ${
                                      isBest
                                        ? "text-[#0D9488] font-bold"
                                        : "text-slate-700 dark:text-slate-300"
                                    }`}
                                  >
                                    {metric.format(val)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Section 3: Revenue Trend Overlay */}
            {revenueTrendData.length > 0 && (
              <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800 mb-8">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                    Revenue Trend (Last 8 Quarters)
                  </h3>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="quarter"
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          tickLine={false}
                          axisLine={{ stroke: "#e2e8f0" }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) => {
                            if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}B`;
                            return `$${v.toFixed(0)}M`;
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(value: number) => [fmtB(value), ""]}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 12 }}
                        />
                        {selected.map((c, idx) => (
                          <Line
                            key={c.ticker}
                            type="monotone"
                            dataKey={c.ticker}
                            stroke={COMPANY_COLORS[idx]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section 4: Margin Comparison Chart */}
            {marginCompData.length > 0 && (
              <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800 mb-8">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                    Margin Comparison (%)
                  </h3>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={marginCompData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="metric"
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          tickLine={false}
                          axisLine={{ stroke: "#e2e8f0" }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) => `${v}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 12 }}
                        />
                        {selected.map((c, idx) => (
                          <Bar
                            key={c.ticker}
                            dataKey={c.ticker}
                            fill={COMPANY_COLORS[idx]}
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

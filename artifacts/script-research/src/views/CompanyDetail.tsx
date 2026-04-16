"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Building2, DollarSign, BarChart3, Percent, TrendingUp, TrendingDown, AlertTriangle, Wind, Zap } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CoreSheet {
  quarters?: string[];
  income_statement?: Record<string, Record<string, number>>;
  cash_flow?: Record<string, Record<string, number>>;
  balance_sheet?: Record<string, Record<string, number>>;
  valuation?: Record<string, Record<string, number>>;
  segments?: Record<string, Record<string, number>>;
  bull_bear?: {
    bull_case?: string[];
    bear_case?: string[];
    tailwinds?: string[];
    headwinds?: string[];
    watchlist_metrics?: string[];
  };
}

interface CompanyData {
  id: number;
  ticker: string;
  name: string;
  exchange: string | null;
  company_type: string | null;
  status: string;
  last_updated: string | null;
  core_sheet: CoreSheet | null;
}

// Clean display name mapping for metric keys
const METRIC_LABELS: Record<string, string> = {
  revenue: "Revenue",
  cost_of_revenue: "Cost of Revenue",
  gross_profit: "Gross Profit",
  gross_margin: "Gross Margin",
  operating_income: "Operating Income",
  operating_margin: "Operating Margin",
  ebitda: "EBITDA",
  ebitda_margin: "EBITDA Margin",
  net_income: "Net Income",
  net_margin: "Net Margin",
  eps_diluted: "EPS (Diluted)",
  eps_basic: "EPS (Basic)",
  shares_outstanding: "Shares Outstanding",
  operating_cash_flow: "Operating Cash Flow",
  capex: "Capital Expenditures",
  free_cash_flow: "Free Cash Flow",
  fcf_margin: "FCF Margin",
  dividends_paid: "Dividends Paid",
  share_repurchases: "Share Repurchases",
  total_assets: "Total Assets",
  total_liabilities: "Total Liabilities",
  shareholders_equity: "Shareholders' Equity",
  cash_and_equivalents: "Cash & Equivalents",
  total_debt: "Total Debt",
  net_debt: "Net Debt",
  goodwill: "Goodwill",
  pe: "P/E Ratio",
  ev_revenue: "EV/Revenue",
  ev_ebitda: "EV/EBITDA",
  ev_ebit: "EV/EBIT",
  p_ocf: "P/OCF",
  p_fcf: "P/FCF",
  ev_ocf: "EV/OCF",
  ev_fcf: "EV/FCF",
  roic: "ROIC",
  roce: "ROCE",
  roe: "ROE",
  roa: "ROA",
  debt_to_equity: "Debt/Equity",
  current_ratio: "Current Ratio",
  interest_coverage: "Interest Coverage",
  net_interest_income: "Net Interest Income",
  provision_credit_losses: "Provision for Credit Losses",
  noninterest_revenue: "Non-Interest Revenue",
  noninterest_expense: "Non-Interest Expense",
  research_and_development: "R&D Expense",
  sga: "SG&A Expense",
  depreciation_amortization: "D&A",
  interest_expense: "Interest Expense",
  tax_expense: "Tax Expense",
  effective_tax_rate: "Effective Tax Rate",
  revenue_growth_yoy: "Revenue Growth (YoY)",
  enterprise_value: "Enterprise Value",
  market_cap: "Market Cap",
};

function getMetricLabel(key: string): string {
  if (METRIC_LABELS[key]) return METRIC_LABELS[key];
  // Fallback: title case with underscores replaced
  return key
    .replace(/_/g, " ")
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/\bYoy\b/, "YoY")
    .replace(/\bEps\b/, "EPS")
    .replace(/\bEbitda\b/, "EBITDA")
    .replace(/\bFcf\b/, "FCF")
    .replace(/\bOcf\b/, "OCF")
    .replace(/\bSga\b/, "SG&A")
    .replace(/\bRoe\b/, "ROE")
    .replace(/\bRoic\b/, "ROIC")
    .replace(/\bRoce\b/, "ROCE")
    .replace(/\bRoa\b/, "ROA");
}

function fmtCard(val: number | null | undefined, format: "dollar" | "pct" | "ratio"): string {
  if (val === null || val === undefined) return "\u2014";
  if (format === "pct") return `${(val * 100).toFixed(1)}%`;
  if (format === "ratio") return `${val.toFixed(1)}x`;
  const abs = Math.abs(val);
  if (abs >= 1000) return `$${(val / 1000).toFixed(1)}B`;
  return `$${val.toFixed(1)}M`;
}

function getLastVal(series: Record<string, number> | undefined): number | null {
  if (!series) return null;
  const vals = Object.values(series);
  return vals.length > 0 ? vals[vals.length - 1] : null;
}

function MetricTable({
  title,
  data,
  quarters,
  format = "number",
}: {
  title: string;
  data: Record<string, Record<string, number>> | undefined;
  quarters: string[];
  format?: "number" | "pct" | "ratio";
}) {
  if (!data || Object.keys(data).length === 0) return null;

  const fmt = (v: number | undefined) => {
    if (v === undefined || v === null) return "\u2014";
    if (format === "pct") return `${(v * 100).toFixed(1)}%`;
    if (format === "ratio") return `${v.toFixed(1)}x`;
    const abs = Math.abs(v);
    if (abs >= 1000) return `$${(v / 1000).toFixed(1)}B`;
    if (abs >= 1) return `$${v.toFixed(1)}M`;
    return v.toFixed(2);
  };

  const displayQ = quarters.slice(-6);

  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-[#0D9488]" />
        {title}
      </h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 w-52">Metric</th>
              {displayQ.map((q) => (
                <th key={q} className="text-right px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {q}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(data).map(([metric, series], i) => (
              <tr
                key={metric}
                className={`border-t border-slate-100 dark:border-slate-800/50 ${
                  i % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-slate-50/40 dark:bg-slate-900/20"
                } hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-colors duration-100`}
              >
                <td className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium text-[13px]">
                  {getMetricLabel(metric)}
                </td>
                {displayQ.map((q) => (
                  <td key={q} className="text-right px-4 py-2 text-slate-600 dark:text-slate-400 font-mono text-[13px] tabular-nums">
                    {fmt(series[q])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <Card className="rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function RevenueChart({ quarters, income }: { quarters: string[]; income: Record<string, Record<string, number>> }) {
  const revSeries = income.revenue;
  if (!revSeries) return null;
  const displayQ = quarters.slice(-8);
  const chartData = displayQ.map((q) => ({
    quarter: q,
    revenue: revSeries[q] ?? 0,
  }));

  return (
    <Card className="rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
      <CardContent className="p-5">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          Revenue Trend
        </h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
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
                tickFormatter={(v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}B` : `$${v}M`)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#fff",
                }}
                formatter={(value: number) => [value >= 1000 ? `$${(value / 1000).toFixed(1)}B` : `$${value.toFixed(0)}M`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#0D9488" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function MarginChart({ quarters, income }: { quarters: string[]; income: Record<string, Record<string, number>> }) {
  const gm = income.gross_margin;
  const om = income.operating_margin;
  const nm = income.net_margin;
  if (!gm && !om && !nm) return null;
  const displayQ = quarters.slice(-8);
  const chartData = displayQ.map((q) => ({
    quarter: q,
    "Gross Margin": gm?.[q] != null ? +(gm[q] * 100).toFixed(1) : null,
    "Op Margin": om?.[q] != null ? +(om[q] * 100).toFixed(1) : null,
    "Net Margin": nm?.[q] != null ? +(nm[q] * 100).toFixed(1) : null,
  }));

  return (
    <Card className="rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
      <CardContent className="p-5">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          Margin Trends
        </h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
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
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#fff",
                }}
                formatter={(value: number) => [`${value.toFixed(1)}%`]}
              />
              {gm && <Line type="monotone" dataKey="Gross Margin" stroke="#0D9488" strokeWidth={2} dot={false} />}
              {om && <Line type="monotone" dataKey="Op Margin" stroke="#6366f1" strokeWidth={2} dot={false} />}
              {nm && <Line type="monotone" dataKey="Net Margin" stroke="#f59e0b" strokeWidth={2} dot={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-5 mt-3 pl-2">
          {gm && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="h-2 w-2 rounded-full bg-[#0D9488]" />
              Gross
            </div>
          )}
          {om && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="h-2 w-2 rounded-full bg-[#6366f1]" />
              Operating
            </div>
          )}
          {nm && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="h-2 w-2 rounded-full bg-[#f59e0b]" />
              Net
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ThesisSection({ bull_bear }: { bull_bear: NonNullable<CoreSheet["bull_bear"]> }) {
  const sections = [
    { key: "bull_case" as const, title: "Bull Case", items: bull_bear.bull_case, icon: TrendingUp, iconColor: "text-emerald-500", bgColor: "bg-emerald-50 dark:bg-emerald-900/10", borderColor: "border-emerald-200 dark:border-emerald-800/30", headerBg: "bg-emerald-500", dotColor: "bg-emerald-400" },
    { key: "bear_case" as const, title: "Bear Case", items: bull_bear.bear_case, icon: TrendingDown, iconColor: "text-red-500", bgColor: "bg-red-50 dark:bg-red-900/10", borderColor: "border-red-200 dark:border-red-800/30", headerBg: "bg-red-500", dotColor: "bg-red-400" },
    { key: "tailwinds" as const, title: "Tailwinds", items: bull_bear.tailwinds, icon: Wind, iconColor: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-900/10", borderColor: "border-blue-200 dark:border-blue-800/30", headerBg: "bg-blue-500", dotColor: "bg-blue-400" },
    { key: "headwinds" as const, title: "Risks & Headwinds", items: bull_bear.headwinds, icon: AlertTriangle, iconColor: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-900/10", borderColor: "border-amber-200 dark:border-amber-800/30", headerBg: "bg-amber-500", dotColor: "bg-amber-400" },
  ];

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-[#0D9488]" />
        Investment Thesis
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(({ key, title, items, icon: Icon, iconColor, bgColor, borderColor, dotColor }) => {
          if (!items || items.length === 0) return null;
          return (
            <Card key={key} className={`rounded-xl border ${borderColor} shadow-sm overflow-hidden`}>
              <div className={`px-5 py-3 ${bgColor} flex items-center gap-2.5`}>
                <Icon className={`h-4 w-4 ${iconColor}`} />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
              </div>
              <CardContent className="p-5">
                <ul className="space-y-3">
                  {items.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <div className={`h-1.5 w-1.5 rounded-full ${dotColor} mt-2 shrink-0`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function CompanyDetail() {
  const params = useParams<{ ticker: string }>();
  const ticker = (params.ticker as string)?.toUpperCase() || "";
  const [data, setData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    fetch(`/api/companies/${ticker}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<CompanyData>;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [ticker]);

  const cs = data?.core_sheet;
  const quarters = cs?.quarters || [];
  const bb = cs?.bull_bear;

  // Extract key metrics for summary cards
  const lastRev = getLastVal(cs?.income_statement?.revenue);
  const lastPE = getLastVal(cs?.valuation?.pe);
  const lastROE = getLastVal(cs?.valuation?.roe);
  const lastFCF = getLastVal(cs?.cash_flow?.free_cash_flow);

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-[#0D9488] transition-colors duration-150 mb-5"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Watchlist
          </Link>

          {loading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div>
                <Skeleton className="h-7 w-48 rounded mb-2" />
                <Skeleton className="h-4 w-32 rounded" />
              </div>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          ) : data ? (
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-sm">
                <Building2 className="h-6 w-6 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {data.name}
                  </h1>
                  <Badge variant="outline" className="rounded-md px-2.5 py-0.5 text-xs font-bold tracking-wide">
                    {data.ticker}
                  </Badge>
                  {data.exchange && (
                    <Badge variant="outline" className="rounded-md px-2.5 py-0.5 text-xs text-slate-500">
                      {data.exchange}
                    </Badge>
                  )}
                  {data.company_type && (
                    <Badge className="rounded-md px-2.5 py-0.5 text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-0 font-semibold uppercase tracking-wide">
                      {data.company_type}
                    </Badge>
                  )}
                </div>
                {data.last_updated && (
                  <p className="text-xs text-slate-400 mt-1">
                    Last updated {new Date(data.last_updated).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* No Data State */}
        {!loading && !error && data && !cs && (
          <Card className="rounded-xl border-dashed border-2 border-slate-300 dark:border-slate-700 shadow-none">
            <CardContent className="py-16 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No financial data available
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                Upload fiscal.ai Excel files for {data.ticker} to generate the Core Sheet with financial analysis, charts, and AI-generated investment thesis.
              </p>
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 bg-[#0D9488] hover:bg-teal-700 text-white rounded-xl shadow-sm transition-all duration-150 h-10 px-6 text-sm font-medium"
              >
                Upload Files
              </Link>
            </CardContent>
          </Card>
        )}

        {cs && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                label="Revenue (Latest)"
                value={fmtCard(lastRev, "dollar")}
                icon={DollarSign}
                color="bg-teal-50 dark:bg-teal-900/20 text-[#0D9488]"
              />
              <SummaryCard
                label="P/E Ratio"
                value={fmtCard(lastPE, "ratio")}
                icon={BarChart3}
                color="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
              />
              <SummaryCard
                label="ROE"
                value={fmtCard(lastROE, "pct")}
                icon={Percent}
                color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
              />
              <SummaryCard
                label="Free Cash Flow"
                value={fmtCard(lastFCF, "dollar")}
                icon={Zap}
                color="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
              />
            </div>

            {/* Charts */}
            {cs.income_statement && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RevenueChart quarters={quarters} income={cs.income_statement} />
                <MarginChart quarters={quarters} income={cs.income_statement} />
              </div>
            )}

            {/* Data Tables */}
            <MetricTable title="Income Statement" data={cs.income_statement} quarters={quarters} />
            <MetricTable title="Cash Flow" data={cs.cash_flow} quarters={quarters} />
            <MetricTable title="Balance Sheet" data={cs.balance_sheet} quarters={quarters} />
            <MetricTable title="Valuation Multiples" data={cs.valuation} quarters={quarters} format="ratio" />
            <MetricTable title="Segments & KPIs" data={cs.segments} quarters={quarters} />

            {/* Investment Thesis */}
            {bb && <ThesisSection bull_bear={bb} />}
          </div>
        )}
      </div>
    </Layout>
  );
}

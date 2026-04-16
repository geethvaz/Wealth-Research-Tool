"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Building2 } from "lucide-react";

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

function fmtNum(val: number | null | undefined): string {
  if (val === null || val === undefined) return "\u2014";
  const abs = Math.abs(val);
  if (abs >= 1000) return `${(val / 1000).toFixed(1)}B`;
  if (abs >= 1) return `${val.toFixed(1)}M`;
  return `${(val * 100).toFixed(1)}%`;
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

  // Show last 6 quarters
  const displayQ = quarters.slice(-6);

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide mb-3">
        {title}
      </h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800">
              <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-400 w-48">Metric</th>
              {displayQ.map((q) => (
                <th key={q} className="text-right px-3 py-2 font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {q}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(data).map(([metric, series], i) => (
              <tr
                key={metric}
                className={i % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-slate-50/50 dark:bg-slate-900/30"}
              >
                <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300 font-medium">
                  {metric.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </td>
                {displayQ.map((q) => (
                  <td key={q} className="text-right px-3 py-1.5 text-slate-600 dark:text-slate-400 font-mono">
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

  return (
    <Layout>
      <div className="p-8 max-w-[1400px] w-full mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-[#0D9488] transition-colors duration-150 mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Watchlist
          </Link>

          {loading ? (
            <Skeleton className="h-10 w-64 rounded" />
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : data ? (
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                <Building2 className="h-6 w-6 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {data.name}
                  </h1>
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs">
                    {data.ticker}
                  </Badge>
                  {data.exchange && (
                    <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs">
                      {data.exchange}
                    </Badge>
                  )}
                  {data.company_type && (
                    <Badge className="rounded-full px-2.5 py-0.5 text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-0">
                      {data.company_type}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {!loading && !error && data && !cs && (
          <Card className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="p-6 text-center">
              <p className="text-amber-700 dark:text-amber-400">
                No financial data yet. Upload fiscal.ai files for {data.ticker} to build a Core Sheet.
              </p>
            </CardContent>
          </Card>
        )}

        {cs && (
          <div className="space-y-2">
            <MetricTable title="Income Statement" data={cs.income_statement} quarters={quarters} />
            <MetricTable title="Cash Flow" data={cs.cash_flow} quarters={quarters} />
            <MetricTable title="Balance Sheet" data={cs.balance_sheet} quarters={quarters} />
            <MetricTable title="Valuation" data={cs.valuation} quarters={quarters} format="ratio" />
            <MetricTable title="Segments" data={cs.segments} quarters={quarters} />

            {bb && (
              <Card className="rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide mb-4">
                    Investment Thesis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {bb.bull_case && bb.bull_case.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-emerald-600 uppercase mb-2">Bull Case</h4>
                        <ul className="space-y-1.5">
                          {bb.bull_case.map((item, i) => (
                            <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                              <span className="text-emerald-500 shrink-0">+</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {bb.bear_case && bb.bear_case.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-red-500 uppercase mb-2">Bear Case</h4>
                        <ul className="space-y-1.5">
                          {bb.bear_case.map((item, i) => (
                            <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                              <span className="text-red-500 shrink-0">&minus;</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {bb.tailwinds && bb.tailwinds.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-blue-600 uppercase mb-2">Tailwinds</h4>
                        <ul className="space-y-1.5">
                          {bb.tailwinds.map((item, i) => (
                            <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                              <span className="text-blue-500 shrink-0">&#8599;</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {bb.headwinds && bb.headwinds.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-amber-600 uppercase mb-2">Risks</h4>
                        <ul className="space-y-1.5">
                          {bb.headwinds.map((item, i) => (
                            <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                              <span className="text-amber-500 shrink-0">!</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

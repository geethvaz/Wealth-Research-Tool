"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";

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
  enterprise_value: "Enterprise Value",
  market_cap: "Market Cap",
};

function getMetricLabel(key: string): string {
  if (METRIC_LABELS[key]) return METRIC_LABELS[key];
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

function fmtVal(
  v: number | undefined | null,
  format: "dollar" | "pct" | "ratio" | "number"
): string {
  if (v === undefined || v === null) return "\u2014";
  if (format === "pct") return `${(v * 100).toFixed(1)}%`;
  if (format === "ratio") return `${v.toFixed(1)}x`;
  if (format === "dollar") {
    const abs = Math.abs(v);
    if (abs >= 1000) return `$${(v / 1000).toFixed(1)}B`;
    return `$${v.toFixed(1)}M`;
  }
  const abs = Math.abs(v);
  if (abs >= 1000) return `$${(v / 1000).toFixed(1)}B`;
  if (abs >= 1) return `$${v.toFixed(1)}M`;
  return v.toFixed(2);
}

function getLastVal(series: Record<string, number> | undefined): number | null {
  if (!series) return null;
  const vals = Object.values(series);
  return vals.length > 0 ? vals[vals.length - 1] : null;
}

function detectFormat(key: string): "pct" | "ratio" | "dollar" | "number" {
  if (key.includes("margin") || key === "roe" || key === "roa" || key === "roic" || key === "roce" || key === "effective_tax_rate") return "pct";
  if (key === "pe" || key.startsWith("ev_") || key.startsWith("p_") || key === "debt_to_equity" || key === "current_ratio" || key === "interest_coverage") return "ratio";
  return "number";
}

const TODAY = new Date().toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default function ReportPage() {
  const params = useParams<{ ticker: string }>();
  const ticker = (params.ticker as string)?.toUpperCase() || "";
  const [data, setData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printTriggered = useRef(false);

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

  // Auto-trigger print after data loads
  useEffect(() => {
    if (!loading && data && !printTriggered.current) {
      printTriggered.current = true;
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [loading, data]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-500 text-lg">Loading report data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-red-600 text-lg">Error loading data: {error}</p>
      </div>
    );
  }

  if (!data) return null;

  const cs = data.core_sheet;
  const quarters = cs?.quarters || [];
  const displayQ = quarters.slice(-6);
  const bb = cs?.bull_bear;

  // Key metrics for summary
  const keyMetrics: { label: string; value: string }[] = [];
  if (cs?.income_statement?.revenue) {
    keyMetrics.push({ label: "Revenue (Latest Q)", value: fmtVal(getLastVal(cs.income_statement.revenue), "dollar") });
  }
  if (cs?.income_statement?.gross_margin) {
    keyMetrics.push({ label: "Gross Margin", value: fmtVal(getLastVal(cs.income_statement.gross_margin), "pct") });
  }
  if (cs?.income_statement?.operating_margin) {
    keyMetrics.push({ label: "Operating Margin", value: fmtVal(getLastVal(cs.income_statement.operating_margin), "pct") });
  }
  if (cs?.income_statement?.net_margin) {
    keyMetrics.push({ label: "Net Margin", value: fmtVal(getLastVal(cs.income_statement.net_margin), "pct") });
  }
  if (cs?.valuation?.pe) {
    keyMetrics.push({ label: "P/E Ratio", value: fmtVal(getLastVal(cs.valuation.pe), "ratio") });
  }
  if (cs?.valuation?.ev_ebitda) {
    keyMetrics.push({ label: "EV/EBITDA", value: fmtVal(getLastVal(cs.valuation.ev_ebitda), "ratio") });
  }
  if (cs?.valuation?.ev_revenue) {
    keyMetrics.push({ label: "EV/Revenue", value: fmtVal(getLastVal(cs.valuation.ev_revenue), "ratio") });
  }
  if (cs?.valuation?.roe) {
    keyMetrics.push({ label: "ROE", value: fmtVal(getLastVal(cs.valuation.roe), "pct") });
  }
  if (cs?.valuation?.roic) {
    keyMetrics.push({ label: "ROIC", value: fmtVal(getLastVal(cs.valuation.roic), "pct") });
  }
  if (cs?.cash_flow?.free_cash_flow) {
    keyMetrics.push({ label: "Free Cash Flow", value: fmtVal(getLastVal(cs.cash_flow.free_cash_flow), "dollar") });
  }

  // Quarterly IS metrics for the table
  const isMetricKeys = ["revenue", "gross_profit", "gross_margin", "operating_income", "operating_margin", "ebitda", "net_income", "net_margin", "eps_diluted"].filter(
    (k) => cs?.income_statement?.[k]
  );

  return (
    <>
      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-size: 11pt;
          }
          @page {
            margin: 0.75in;
            size: letter;
          }
          .page-break-before {
            break-before: page;
          }
          .avoid-break {
            break-inside: avoid;
          }
        }
        @media screen {
          .report-container {
            max-width: 850px;
            margin: 0 auto;
            padding: 2rem;
          }
        }
      `}</style>

      <div className="min-h-screen bg-white text-black report-container">
        {/* Print Button */}
        <div className="no-print fixed top-4 right-4 z-50">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium shadow-lg transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </button>
        </div>

        {/* Header */}
        <header className="border-b-2 border-gray-900 pb-4 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 border-2 border-gray-900 rounded flex items-center justify-center">
                  <span className="text-sm font-bold tracking-tight">{data.ticker}</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                {data.exchange && <span>{data.exchange}</span>}
                {data.exchange && data.company_type && <span className="text-gray-300">|</span>}
                {data.company_type && (
                  <span className="uppercase tracking-wide text-xs font-semibold text-gray-500">
                    {data.company_type}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Client Report</p>
              <p className="font-medium text-gray-700">{TODAY}</p>
            </div>
          </div>
        </header>

        {!cs ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No financial data available for this company.</p>
            <p className="text-sm mt-2">Upload fiscal.ai files to generate the report.</p>
          </div>
        ) : (
          <>
            {/* Section 1: Key Metrics */}
            {keyMetrics.length > 0 && (
              <section className="mb-8 avoid-break">
                <h2 className="text-lg font-bold uppercase tracking-wider border-b border-gray-300 pb-2 mb-4">
                  Key Metrics
                </h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {keyMetrics.map((m) => (
                    <div key={m.label} className="flex justify-between items-center py-1.5 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{m.label}</span>
                      <span className="text-sm font-semibold tabular-nums">{m.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Section 2: Quarterly Data */}
            {displayQ.length > 0 && isMetricKeys.length > 0 && cs.income_statement && (
              <section className="mb-8 avoid-break">
                <h2 className="text-lg font-bold uppercase tracking-wider border-b border-gray-300 pb-2 mb-4">
                  Quarterly Financial Data
                </h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left py-2 pr-4 font-semibold text-gray-700 border-b-2 border-gray-300 w-40">
                        Metric
                      </th>
                      {displayQ.map((q) => (
                        <th
                          key={q}
                          className="text-right py-2 px-2 font-semibold text-gray-700 border-b-2 border-gray-300 whitespace-nowrap"
                        >
                          {q}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isMetricKeys.map((key, i) => {
                      const series = cs.income_statement![key];
                      const fmt = detectFormat(key);
                      return (
                        <tr
                          key={key}
                          className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="py-1.5 pr-4 text-gray-700 font-medium border-b border-gray-100">
                            {getMetricLabel(key)}
                          </td>
                          {displayQ.map((q) => (
                            <td
                              key={q}
                              className="text-right py-1.5 px-2 tabular-nums border-b border-gray-100"
                            >
                              {fmtVal(series?.[q], fmt)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}

            {/* Section 2b: Valuation Multiples Table */}
            {cs.valuation && Object.keys(cs.valuation).length > 0 && displayQ.length > 0 && (
              <section className="mb-8 avoid-break">
                <h2 className="text-lg font-bold uppercase tracking-wider border-b border-gray-300 pb-2 mb-4">
                  Valuation Multiples
                </h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left py-2 pr-4 font-semibold text-gray-700 border-b-2 border-gray-300 w-40">
                        Metric
                      </th>
                      {displayQ.map((q) => (
                        <th
                          key={q}
                          className="text-right py-2 px-2 font-semibold text-gray-700 border-b-2 border-gray-300 whitespace-nowrap"
                        >
                          {q}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(cs.valuation).map(([key, series], i) => {
                      const fmt = detectFormat(key);
                      return (
                        <tr
                          key={key}
                          className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="py-1.5 pr-4 text-gray-700 font-medium border-b border-gray-100">
                            {getMetricLabel(key)}
                          </td>
                          {displayQ.map((q) => (
                            <td
                              key={q}
                              className="text-right py-1.5 px-2 tabular-nums border-b border-gray-100"
                            >
                              {fmtVal(series?.[q], fmt)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}

            {/* Section 3: Bull/Bear Thesis */}
            {bb && (
              <section className="page-break-before pt-2">
                <h2 className="text-lg font-bold uppercase tracking-wider border-b border-gray-300 pb-2 mb-6">
                  Investment Thesis
                </h2>

                <div className="grid grid-cols-2 gap-8 mb-6">
                  {/* Bull Case */}
                  {bb.bull_case && bb.bull_case.length > 0 && (
                    <div className="avoid-break">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-green-800 mb-3 pb-1 border-b border-green-200">
                        Bull Case
                      </h3>
                      <ul className="space-y-2">
                        {bb.bull_case.map((item, i) => (
                          <li key={i} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                            <span className="text-green-600 mt-0.5 shrink-0">+</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Bear Case */}
                  {bb.bear_case && bb.bear_case.length > 0 && (
                    <div className="avoid-break">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-red-800 mb-3 pb-1 border-b border-red-200">
                        Bear Case
                      </h3>
                      <ul className="space-y-2">
                        {bb.bear_case.map((item, i) => (
                          <li key={i} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                            <span className="text-red-600 mt-0.5 shrink-0">&ndash;</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {/* Tailwinds */}
                  {bb.tailwinds && bb.tailwinds.length > 0 && (
                    <div className="avoid-break">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-blue-800 mb-3 pb-1 border-b border-blue-200">
                        Tailwinds
                      </h3>
                      <ul className="space-y-2">
                        {bb.tailwinds.map((item, i) => (
                          <li key={i} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                            <span className="text-blue-600 mt-0.5 shrink-0">&bull;</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Headwinds / Risks */}
                  {bb.headwinds && bb.headwinds.length > 0 && (
                    <div className="avoid-break">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-amber-800 mb-3 pb-1 border-b border-amber-200">
                        Risks & Headwinds
                      </h3>
                      <ul className="space-y-2">
                        {bb.headwinds.map((item, i) => (
                          <li key={i} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                            <span className="text-amber-600 mt-0.5 shrink-0">!</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-4 border-t border-gray-300 text-xs text-gray-400 flex justify-between">
          <span>Generated by Script Research</span>
          <span>{TODAY}</span>
        </footer>
      </div>
    </>
  );
}

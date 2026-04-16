"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Download,
  RefreshCw,
  ExternalLink,
  Building2,
  ChevronLeft,
} from "lucide-react";
import { mockCompanies, mockQuarterlyData } from "@/lib/data";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function CompanyDetail() {
  const params = useParams<{ ticker: string }>();
  const ticker = (params.ticker as string)?.toUpperCase() || "ADBE";

  const company = mockCompanies.find((c) => c.ticker === ticker) || mockCompanies[0];

  return (
    <Layout>
      <div
        className="p-8 max-w-[1400px] w-full mx-auto"
        data-testid={`page-company-detail-${ticker}`}
      >
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-[#0D9488] transition-colors duration-150 mb-4"
            data-testid="link-back"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Watchlist
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                <Building2 className="h-6 w-6 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1
                    className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
                    data-testid="company-name"
                  >
                    {company.name}
                  </h1>
                  <Badge
                    className="bg-[#0D9488] hover:bg-teal-700 rounded-md px-2"
                    data-testid="company-ticker"
                  >
                    {company.ticker}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className="text-sm text-slate-500 dark:text-slate-400"
                    data-testid="company-type"
                  >
                    {company.type}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <Badge
                    variant="outline"
                    className={`rounded-full px-2 py-0 border-0 font-medium text-xs ${
                      company.status === "Current"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                    data-testid="company-status"
                  >
                    {company.status}
                  </Badge>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="rounded-xl border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all duration-150"
              data-testid="btn-export"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Export to OneDrive
            </Button>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <MetricCard label="Rev TTM" value={company.revTtm} />
          <MetricCard label="Gross Margin" value={company.grossMargin} />
          <MetricCard label="EBIT Margin" value={company.ebitMargin} />
          <MetricCard label="EV/EBITDA" value={company.evEbitda} />
          <MetricCard label="P/E" value={company.pe} />
          <MetricCard label="FCF Yield" value={company.fcfYield} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Revenue (Quarterly, $B)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="h-[300px] w-full mt-4"
                data-testid="chart-revenue"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={mockQuarterlyData}
                    margin={{ top: 5, right: 20, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E2E8F0"
                    />
                    <XAxis
                      dataKey="quarter"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748B", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748B", fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#F1F5F9", opacity: 0.4 }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#0D9488"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Margins (%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="h-[300px] w-full mt-4"
                data-testid="chart-margins"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={mockQuarterlyData}
                    margin={{ top: 5, right: 20, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E2E8F0"
                    />
                    <XAxis
                      dataKey="quarter"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748B", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748B", fontSize: 12 }}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="grossMargin"
                      name="Gross Margin"
                      stroke="#0F172A"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ebitMargin"
                      name="EBIT Margin"
                      stroke="#0D9488"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800 lg:col-span-1">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Core Sheet
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Last Built
                  </p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-200 mt-1">
                    {company.lastUpdated}
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    className="w-full bg-[#0D9488] hover:bg-teal-700 text-white rounded-xl shadow-sm transition-all duration-150"
                    data-testid="btn-download-core"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-[#0D9488] text-[#0D9488] hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all duration-150"
                    data-testid="btn-rebuild-core"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Rebuild Sheet
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800 lg:col-span-2">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
                AI Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div
                className="prose prose-sm prose-slate dark:prose-invert max-w-none"
                data-testid="ai-summary-content"
              >
                <p>
                  <strong>{company.name}</strong> delivered robust Q4 results
                  demonstrating durable demand across its core operating
                  segments. Revenue growth remains steady, underpinned by
                  sustained enterprise investment in strategic initiatives and
                  relatively insulated from broader macroeconomic volatility.
                </p>
                <p>Key observations from recent filings:</p>
                <ul>
                  <li>
                    Gross margin profile exhibits structural resilience,
                    maintaining historical baseline despite input cost pressures.
                  </li>
                  <li>
                    Operating leverage continues to expand as SG&A
                    rationalization efforts begin yielding tangible efficiencies.
                  </li>
                  <li>
                    Free cash flow generation remains a standout feature,
                    enabling flexible capital allocation strategy and continued
                    share repurchases.
                  </li>
                </ul>
                <p>
                  <strong>Outlook:</strong> Management commentary suggests a
                  cautiously optimistic view for the upcoming fiscal year.
                  Valuation multiples sit slightly above historical averages,
                  reflecting premium assigned to earnings visibility and
                  execution track record.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800">
      <CardContent className="p-4 flex flex-col justify-center h-full">
        <p
          className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate"
          title={label}
        >
          {label}
        </p>
        <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

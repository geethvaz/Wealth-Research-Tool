"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye, RefreshCw, TrendingUp, Database, CheckCircle2, Clock, Upload, AlertTriangle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i} className="border-b border-slate-100 dark:border-slate-800/50">
          {Array.from({ length: 12 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full rounded" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

const TYPE_COLORS: Record<string, string> = {
  software: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  banking: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  financials: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  internet: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

function SparkLine({ series }: { series: Record<string, number> | undefined }) {
  if (!series) return null;
  const vals = Object.values(series).filter((v) => v !== null && v !== undefined);
  if (vals.length < 2) return null;
  const last6 = vals.slice(-6);
  const min = Math.min(...last6);
  const max = Math.max(...last6);
  const range = max - min || 1;
  const w = 48;
  const h = 20;
  const points = last6
    .map((v, i) => `${(i / (last6.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  const trending = last6[last6.length - 1] >= last6[0];
  return (
    <svg width={w} height={h} className="inline-block ml-2 align-middle">
      <polyline
        points={points}
        fill="none"
        stroke={trending ? "#10b981" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Dashboard() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingTicker, setRefreshingTicker] = useState<string | null>(null);

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

  const handleRefresh = async (company: Company) => {
    setRefreshingTicker(company.ticker);
    try {
      // Find the latest build job for this company and trigger a rebuild
      const res = await fetch(`/api/companies/${company.ticker}`);
      if (!res.ok) throw new Error("Failed to fetch company");
      // Refresh the companies list after a short delay
      setTimeout(() => {
        fetchCompanies();
        setRefreshingTicker(null);
      }, 1500);
    } catch {
      setRefreshingTicker(null);
    }
  };

  const STALE_THRESHOLD_MS = 45 * 24 * 60 * 60 * 1000;

  const isStale = (lastUpdated: string | null): boolean => {
    if (!lastUpdated) return false;
    return Date.now() - new Date(lastUpdated).getTime() > STALE_THRESHOLD_MS;
  };

  const totalCompanies = companies.length;
  const upToDate = companies.filter((c) => c.status === "current").length;
  const withData = companies.filter((c) => c.core_data).length;
  const staleCount = companies.filter((c) => isStale(c.last_updated)).length;
  const lastUpdated = companies.reduce<string | null>((latest, c) => {
    if (!c.last_updated) return latest;
    if (!latest || c.last_updated > latest) return c.last_updated;
    return latest;
  }, null);

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-[1400px] w-full mx-auto" data-testid="page-dashboard">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white" data-testid="page-heading">
              Watchlist
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1" data-testid="page-subheading">
              {totalCompanies > 0 && !loading
                ? `Tracking ${totalCompanies} companies across your research coverage`
                : "Internal research coverage"}
            </p>
          </div>
          <Button
            className="bg-[#0D9488] hover:bg-teal-700 text-white rounded-xl shadow-sm transition-all duration-150 h-10 px-5"
            onClick={() => router.push("/upload")}
            data-testid="btn-add-ticker"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Ticker
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Companies</p>
                  {loading ? <Skeleton className="h-8 w-12 mt-2 rounded" /> : (
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{totalCompanies}</h3>
                  )}
                </div>
                <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-[#0D9488]" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">With Data</p>
                  {loading ? <Skeleton className="h-8 w-12 mt-2 rounded" /> : (
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{withData}</h3>
                  )}
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Up to Date</p>
                  {loading ? <Skeleton className="h-8 w-12 mt-2 rounded" /> : (
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{upToDate}</h3>
                  )}
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Last Updated</p>
                  {loading ? <Skeleton className="h-8 w-32 mt-2 rounded" /> : (
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{formatDate(lastUpdated)}</h3>
                  )}
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staleness Banner */}
        {!loading && staleCount > 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {staleCount} {staleCount === 1 ? "company has" : "companies have"} data older than 45 days. New quarterly data may be available on fiscal.ai.
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800/50 p-4 mb-6 text-sm text-red-700 dark:text-red-400">
            Failed to load companies: {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && companies.length === 0 && (
          <Card className="rounded-xl border-dashed border-2 border-slate-300 dark:border-slate-700 shadow-none">
            <CardContent className="py-16 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No companies yet
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                Upload fiscal.ai Excel files to start building your research coverage. Each upload auto-detects the ticker, exchange, and company type.
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
        )}

        {/* Data Table */}
        {(loading || companies.length > 0) && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 dark:border-slate-800 hover:bg-transparent bg-slate-50/80 dark:bg-slate-900/50">
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-5">Ticker</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Company</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Rev TTM</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Gross Margin</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">EBIT Margin</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">EV/EBITDA</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">P/E</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">FCF Yield</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Last Updated</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Status</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right pr-5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableSkeleton />
                  ) : (
                    companies.map((company, index) => {
                      const cd = company.core_data;
                      const revSeries = cd?.income_statement?.revenue;
                      const lastRev = getLastVal(revSeries);
                      const lastGM = getLastVal(cd?.income_statement?.gross_margin);
                      const lastEBITMargin = getLastVal(cd?.income_statement?.operating_margin);
                      const lastEvEbitda = getLastVal(cd?.valuation?.ev_ebitda);
                      const lastPE = getLastVal(cd?.valuation?.pe);
                      const lastFcf = getLastVal(cd?.cash_flow?.fcf);
                      const lastMktCap = getLastVal(cd?.valuation?.market_cap);
                      const fcfYield = lastFcf !== null && lastMktCap !== null && lastMktCap !== 0
                        ? lastFcf / lastMktCap
                        : null;
                      const typeColor = TYPE_COLORS[company.company_type?.toLowerCase() ?? ""] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";

                      return (
                        <TableRow
                          key={company.ticker}
                          className={`border-b border-slate-100 dark:border-slate-800/50 cursor-pointer transition-colors duration-100 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 ${
                            index % 2 !== 0 ? "bg-slate-50/40 dark:bg-slate-900/20" : "bg-white dark:bg-transparent"
                          }`}
                          onClick={() => router.push(`/company/${company.ticker}`)}
                        >
                          <TableCell className="pl-5">
                            <span className="font-bold text-slate-900 dark:text-white tracking-wide">
                              {company.ticker}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{company.name}</span>
                          </TableCell>
                          <TableCell>
                            {company.company_type ? (
                              <Badge variant="outline" className={`rounded-md px-2 py-0.5 text-[11px] font-semibold border-0 uppercase tracking-wide ${typeColor}`}>
                                {company.company_type}
                              </Badge>
                            ) : (
                              <span className="text-slate-400">\u2014</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end">
                              <span className="text-slate-700 dark:text-slate-300 font-mono text-sm tabular-nums">
                                {cd ? fmtB(lastRev) : "\u2014"}
                              </span>
                              {revSeries && <SparkLine series={revSeries} />}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-slate-700 dark:text-slate-300 font-mono text-sm tabular-nums">
                            {cd ? fmtPct(lastGM) : "\u2014"}
                          </TableCell>
                          <TableCell className="text-right text-slate-700 dark:text-slate-300 font-mono text-sm tabular-nums">
                            {cd ? fmtPct(lastEBITMargin) : "\u2014"}
                          </TableCell>
                          <TableCell className="text-right text-slate-700 dark:text-slate-300 font-mono text-sm tabular-nums">
                            {cd ? fmtRatio(lastEvEbitda) : "\u2014"}
                          </TableCell>
                          <TableCell className="text-right text-slate-700 dark:text-slate-300 font-mono text-sm tabular-nums">
                            {cd ? fmtRatio(lastPE) : "\u2014"}
                          </TableCell>
                          <TableCell className="text-right text-slate-700 dark:text-slate-300 font-mono text-sm tabular-nums">
                            {cd ? fmtPct(fcfYield) : "\u2014"}
                          </TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400 whitespace-nowrap text-sm">
                            {formatDate(company.last_updated)}
                          </TableCell>
                          <TableCell className="text-center">
                            {cd ? (
                              isStale(company.last_updated) ? (
                                <Badge
                                  variant="outline"
                                  className="rounded-full px-2.5 py-0.5 border-0 text-[11px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                >
                                  Stale
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className={`rounded-full px-2.5 py-0.5 border-0 text-[11px] font-semibold ${
                                    company.status === "current"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  }`}
                                >
                                  {company.status === "current" ? "Current" : "Needs Update"}
                                </Badge>
                              )
                            ) : (
                              <Badge
                                variant="outline"
                                className="rounded-full px-2.5 py-0.5 border-0 text-[11px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                              >
                                No Data
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-5">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-[#0D9488] hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-all duration-150"
                                title="View Details"
                                onClick={() => router.push(`/company/${company.ticker}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 text-slate-400 hover:text-[#0D9488] hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-all duration-150 ${
                                  refreshingTicker === company.ticker ? "animate-spin" : ""
                                }`}
                                title="Refresh Data"
                                onClick={() => handleRefresh(company)}
                                disabled={refreshingTicker === company.ticker}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

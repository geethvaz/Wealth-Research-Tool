"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Database, Key, Cloud, Server, CheckCircle2, XCircle, Clock } from "lucide-react";

interface HealthData {
  status: string;
  DATABASE_URL: string;
  ANTHROPIC_API_KEY: string;
  tables?: string;
  companies?: string;
  db_error?: string;
}

interface CompanySummary {
  total: number;
  withData: number;
  lastUpdated: string | null;
}

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [companySummary, setCompanySummary] = useState<CompanySummary | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthData) => {
        setHealth(data);
        setLoadingHealth(false);
      })
      .catch(() => {
        setHealth({ status: "error", DATABASE_URL: "unknown", ANTHROPIC_API_KEY: "unknown" });
        setLoadingHealth(false);
      });

    fetch("/api/companies")
      .then((res) => res.json())
      .then((data: Array<{ core_data?: unknown; last_updated?: string | null }>) => {
        if (Array.isArray(data)) {
          const withData = data.filter((c) => c.core_data).length;
          const lastUpdated = data.reduce<string | null>((latest, c) => {
            if (!c.last_updated) return latest;
            if (!latest || c.last_updated > latest) return c.last_updated;
            return latest;
          }, null);
          setCompanySummary({ total: data.length, withData, lastUpdated });
        }
        setLoadingCompanies(false);
      })
      .catch(() => {
        setLoadingCompanies(false);
      });
  }, []);

  const dbConnected = health?.DATABASE_URL === "set" && !health?.db_error;
  const apiKeySet = health?.ANTHROPIC_API_KEY === "set";
  const tables = health?.tables ? JSON.parse(health.tables) as string[] : [];

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-[800px] w-full mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Settings className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Settings
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              System status and configuration
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* System Status */}
          <Card className="rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Server className="h-3.5 w-3.5" />
                System Status
              </h2>
            </div>
            <CardContent className="p-5">
              {loadingHealth ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Database className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Database (Neon PostgreSQL)</span>
                    </div>
                    <StatusBadge connected={dbConnected} label={dbConnected ? "Connected" : "Disconnected"} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Key className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Anthropic API Key</span>
                    </div>
                    <StatusBadge connected={apiKeySet} label={apiKeySet ? "Configured" : "Not Set"} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Cloud className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">OneDrive Sync</span>
                    </div>
                    <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold border-0 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500">
                      Not Configured
                    </Badge>
                  </div>

                  {health?.db_error && (
                    <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-3">
                      <p className="text-xs text-red-600 dark:text-red-400 font-mono">{health.db_error}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coverage Overview */}
          <Card className="rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Coverage Overview
              </h2>
            </div>
            <CardContent className="p-5">
              {loadingCompanies ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full rounded" />
                  ))}
                </div>
              ) : companySummary ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Total Companies</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{companySummary.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">With Core Sheet Data</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{companySummary.withData}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Last Build</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {companySummary.lastUpdated
                        ? new Date(companySummary.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "\u2014"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Unable to load company data.</p>
              )}
            </CardContent>
          </Card>

          {/* Database Tables */}
          {tables.length > 0 && (
            <Card className="rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
                <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Database className="h-3.5 w-3.5" />
                  Database Schema
                </h2>
              </div>
              <CardContent className="p-5">
                <div className="flex flex-wrap gap-2">
                  {tables.map((table) => (
                    <Badge
                      key={table}
                      variant="outline"
                      className="rounded-md px-2.5 py-1 text-xs font-mono bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    >
                      {table}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Supported Templates */}
          <Card className="rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Core Sheet Templates
              </h2>
            </div>
            <CardContent className="p-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Software / General</span>
                  <StatusBadge connected={true} label="Active" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Banking</span>
                  <StatusBadge connected={true} label="Active" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Financials (SPGI-style)</span>
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold border-0 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500">
                    Planned
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Internet (Tencent-style)</span>
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold border-0 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500">
                    Planned
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function StatusBadge({ connected, label }: { connected: boolean; label: string }) {
  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border-0 flex items-center gap-1.5 ${
        connected
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      {connected ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </Badge>
  );
}

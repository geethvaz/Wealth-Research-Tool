import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Plus, Eye, RefreshCw } from "lucide-react";
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

interface Company {
  id: number;
  ticker: string;
  name: string;
  exchange: string | null;
  company_type: string | null;
  status: "current" | "needs_update";
  last_updated: string | null;
  created_at: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow
          key={i}
          className="border-b border-slate-100 dark:border-slate-800/50"
        >
          {Array.from({ length: 7 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full rounded" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function Dashboard() {
  const [, navigate] = useLocation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const totalCompanies = companies.length;
  const upToDate = companies.filter((c) => c.status === "current").length;
  const lastUpdated = companies.reduce<string | null>((latest, c) => {
    if (!c.last_updated) return latest;
    if (!latest || c.last_updated > latest) return c.last_updated;
    return latest;
  }, null);

  return (
    <Layout>
      <div
        className="p-8 max-w-[1400px] w-full mx-auto"
        data-testid="page-dashboard"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
              data-testid="page-heading"
            >
              Watchlist
            </h1>
            <p
              className="text-sm text-slate-500 dark:text-slate-400 mt-1"
              data-testid="page-subheading"
            >
              Internal research coverage
            </p>
          </div>
          <Button
            className="bg-[#0D9488] hover:bg-teal-700 text-white rounded-xl shadow-sm transition-all duration-150"
            data-testid="btn-add-ticker"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Ticker
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card
            className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800"
            data-testid="metric-card-companies"
          >
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Companies Covered
              </p>
              {loading ? (
                <Skeleton className="h-8 w-12 mt-2 rounded" />
              ) : (
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                  {totalCompanies}
                </h3>
              )}
            </CardContent>
          </Card>
          <Card
            className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800"
            data-testid="metric-card-uptodate"
          >
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Up to Date
              </p>
              {loading ? (
                <Skeleton className="h-8 w-12 mt-2 rounded" />
              ) : (
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                  {upToDate}
                </h3>
              )}
            </CardContent>
          </Card>
          <Card
            className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800"
            data-testid="metric-card-updated"
          >
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Last Updated
              </p>
              {loading ? (
                <Skeleton className="h-8 w-32 mt-2 rounded" />
              ) : (
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                  {formatDate(lastUpdated)}
                </h3>
              )}
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 mb-6 text-sm text-red-700 dark:text-red-400">
            Failed to load companies: {error}
          </div>
        )}

        <div
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden"
          data-testid="watchlist-table-container"
        >
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900">
              <TableRow className="border-b border-slate-200 dark:border-slate-800 hover:bg-transparent">
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Ticker</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Company</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Type</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Exchange</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Last Updated</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200 text-center">Status</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton />
              ) : (
                companies.map((company, index) => (
                  <TableRow
                    key={company.ticker}
                    className={`border-b border-slate-100 dark:border-slate-800/50 cursor-pointer transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-900 ${
                      index % 2 !== 0
                        ? "bg-[#F8FAFC] dark:bg-slate-900/20"
                        : "bg-white dark:bg-transparent"
                    }`}
                    onClick={() => navigate(`/company/${company.ticker}`)}
                    data-testid={`row-company-${company.ticker.toLowerCase()}`}
                  >
                    <TableCell className="font-semibold text-slate-900 dark:text-white">
                      {company.ticker}
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">
                      {company.name}
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400">
                      {company.company_type ?? "—"}
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400">
                      {company.exchange ?? "—"}
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(company.last_updated)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`rounded-full px-2.5 py-0.5 border-0 font-medium ${
                          company.status === "current"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                        data-testid={`badge-status-${company.ticker.toLowerCase()}`}
                      >
                        {company.status === "current" ? "Current" : "Needs Update"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-[#0D9488] hover:bg-teal-50 dark:hover:bg-teal-900/20"
                          title="View Details"
                          onClick={() => navigate(`/company/${company.ticker}`)}
                          data-testid={`btn-view-${company.ticker.toLowerCase()}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-[#0D9488] hover:bg-teal-50 dark:hover:bg-teal-900/20"
                          title="Refresh Data"
                          data-testid={`btn-refresh-${company.ticker.toLowerCase()}`}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}

import React from "react";
import { Link, useLocation } from "wouter";
import { Plus, Eye, RefreshCw } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { mockCompanies } from "@/lib/data";

export function Dashboard() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="p-8 max-w-[1400px] w-full mx-auto" data-testid="page-dashboard">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white" data-testid="page-heading">Watchlist</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1" data-testid="page-subheading">Internal research coverage</p>
          </div>
          <Button className="bg-[#0D9488] hover:bg-teal-700 text-white rounded-xl shadow-sm transition-all duration-150" data-testid="btn-add-ticker">
            <Plus className="h-4 w-4 mr-2" />
            Add Ticker
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800" data-testid="metric-card-companies">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Companies Covered</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">6</h3>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800" data-testid="metric-card-uptodate">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Up to Date</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">4</h3>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800" data-testid="metric-card-updated">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Last Updated</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">Apr 15, 2026</h3>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden" data-testid="watchlist-table-container">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900">
              <TableRow className="border-b border-slate-200 dark:border-slate-800 hover:bg-transparent">
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Ticker</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Company</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Type</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200 text-right">Rev TTM</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200 text-right">Gross Margin</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200 text-right">EBIT Margin</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200 text-right">EV/EBITDA</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200 text-right">P/E</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200 text-right">FCF Yield</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Last Updated</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200 text-center">Status</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-200 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCompanies.map((company, index) => (
                <TableRow 
                  key={company.ticker} 
                  className={`border-b border-slate-100 dark:border-slate-800/50 cursor-pointer transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-900 ${index % 2 !== 0 ? 'bg-[#F8FAFC] dark:bg-slate-900/20' : 'bg-white dark:bg-transparent'}`}
                  onClick={() => setLocation(`/company/${company.ticker}`)}
                  data-testid={`row-company-${company.ticker.toLowerCase()}`}
                >
                  <TableCell className="font-semibold text-slate-900 dark:text-white">{company.ticker}</TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300">{company.name}</TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">{company.type}</TableCell>
                  <TableCell className="text-right font-medium text-slate-700 dark:text-slate-300">{company.revTtm}</TableCell>
                  <TableCell className="text-right text-slate-700 dark:text-slate-300">{company.grossMargin}</TableCell>
                  <TableCell className="text-right text-slate-700 dark:text-slate-300">{company.ebitMargin}</TableCell>
                  <TableCell className="text-right text-slate-700 dark:text-slate-300">{company.evEbitda}</TableCell>
                  <TableCell className="text-right text-slate-700 dark:text-slate-300">{company.pe}</TableCell>
                  <TableCell className="text-right text-slate-700 dark:text-slate-300">{company.fcfYield}</TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{company.lastUpdated}</TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant="outline" 
                      className={`rounded-full px-2.5 py-0.5 border-0 font-medium ${
                        company.status === 'Current' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}
                      data-testid={`badge-status-${company.ticker.toLowerCase()}`}
                    >
                      {company.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-[#0D9488] hover:bg-teal-50 dark:hover:bg-teal-900/20" title="View Details" onClick={() => setLocation(`/company/${company.ticker}`)} data-testid={`btn-view-${company.ticker.toLowerCase()}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-[#0D9488] hover:bg-teal-50 dark:hover:bg-teal-900/20" title="Refresh Data" data-testid={`btn-refresh-${company.ticker.toLowerCase()}`}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}

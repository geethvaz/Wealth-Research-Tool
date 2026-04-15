export type WatchlistStatus = "Current" | "Needs Update";

export interface CompanyRecord {
  ticker: string;
  name: string;
  type: string;
  revTtm: string;
  grossMargin: string;
  ebitMargin: string;
  evEbitda: string;
  pe: string;
  fcfYield: string;
  lastUpdated: string;
  status: WatchlistStatus;
}

export const mockCompanies: CompanyRecord[] = [
  {
    ticker: "ADBE",
    name: "Adobe Inc.",
    type: "Software",
    revTtm: "$21.4B",
    grossMargin: "55.9%",
    ebitMargin: "33.1%",
    evEbitda: "17.2x",
    pe: "22.3x",
    fcfYield: "4.5%",
    lastUpdated: "Apr 15 2026",
    status: "Current",
  },
  {
    ticker: "JPM",
    name: "JPMorgan Chase",
    type: "Banking",
    revTtm: "$45.8B",
    grossMargin: "—",
    ebitMargin: "33.0%",
    evEbitda: "—",
    pe: "16.1x",
    fcfYield: "—",
    lastUpdated: "Apr 15 2026",
    status: "Current",
  },
  {
    ticker: "SPGI",
    name: "S&P Global",
    type: "Financials",
    revTtm: "$15.3B",
    grossMargin: "70.1%",
    ebitMargin: "28.5%",
    evEbitda: "35.7x",
    pe: "22.6x",
    fcfYield: "3.5%",
    lastUpdated: "Apr 14 2026",
    status: "Current",
  },
  {
    ticker: "PLTR",
    name: "Palantir",
    type: "Software",
    revTtm: "$3.5B",
    grossMargin: "81.2%",
    ebitMargin: "16.2%",
    evEbitda: "214x",
    pe: "187x",
    fcfYield: "1.8%",
    lastUpdated: "Mar 28 2026",
    status: "Needs Update",
  },
  {
    ticker: "C",
    name: "Citigroup",
    type: "Banking",
    revTtm: "$19.9B",
    grossMargin: "—",
    ebitMargin: "19.2%",
    evEbitda: "—",
    pe: "12.6x",
    fcfYield: "—",
    lastUpdated: "Apr 15 2026",
    status: "Current",
  },
  {
    ticker: "SEHK-700",
    name: "Tencent Holdings",
    type: "Internet",
    revTtm: "$27.8B",
    grossMargin: "55.9%",
    ebitMargin: "33.1%",
    evEbitda: "17.2x",
    pe: "22.3x",
    fcfYield: "3.1%",
    lastUpdated: "Apr 10 2026",
    status: "Needs Update",
  },
];

export const mockQuarterlyData = [
  { quarter: "Q1 '24", revenue: 4.8, grossMargin: 52, ebitMargin: 30 },
  { quarter: "Q2 '24", revenue: 5.1, grossMargin: 53, ebitMargin: 31 },
  { quarter: "Q3 '24", revenue: 5.3, grossMargin: 54, ebitMargin: 31.5 },
  { quarter: "Q4 '24", revenue: 5.6, grossMargin: 54.5, ebitMargin: 32 },
  { quarter: "Q1 '25", revenue: 5.4, grossMargin: 55, ebitMargin: 32.5 },
  { quarter: "Q2 '25", revenue: 5.8, grossMargin: 55.2, ebitMargin: 33 },
  { quarter: "Q3 '25", revenue: 6.1, grossMargin: 55.5, ebitMargin: 33.1 },
  { quarter: "Q4 '25", revenue: 6.4, grossMargin: 55.9, ebitMargin: 33.1 },
];

# Script Research — CLAUDE.md

## What this app is
Internal wealth management research tool for a small investment team (led by Geeth Vaz).
Converts fiscal.ai source files into formatted Excel Core Sheets with financial analysis,
segment breakdowns, valuation multiples, and AI-generated bull/bear thesis.

## Origin
This workflow was first built manually in Cowork (Replit AI) — processing 15+ companies
(RTX, IBKR, HOOD, TMO, VRT, NBIS, ANET, PANW, CRWD, GD, CI, ETN, PLTR, ADBE, SPGI, MCO,
JPM, C, SEHK-700) one at a time via Python scripts (openpyxl). The web app automates that
entire workflow: upload files, auto-detect everything, build Excel, download/sync.

## Repository & Deployment
- **GitHub:** github.com/geethvaz/Wealth-Research-Tool (Geeth Vaz's repo, NOT jasonzac's)
- **Deployment:** Vercel (auto-deploys from GitHub pushes to main)
- **Database:** Neon PostgreSQL
- **IMPORTANT:** All pushes go to `origin` = `https://github.com/geethvaz/Wealth-Research-Tool`

## Tech Stack
- Frontend + API routes: Next.js 15 (App Router), Tailwind CSS, shadcn/ui, TypeScript
- Database: Neon PostgreSQL via @neondatabase/serverless + Drizzle ORM
- Excel builder: Python (openpyxl) via Vercel Python serverless function at `/api/build_core_sheet.py`
- AI: Claude Sonnet via Anthropic SDK
- File storage: Neon (base64 in uploaded_files table) + OneDrive output via Microsoft Graph API
- Charts: Recharts
- Icons: Lucide React

## DO NOT USE
- Replit-native integrations (ReplDB, Object Storage, Replit Auth, Replit Deployments)
- Wouter or any client-side router (use Next.js App Router)
- Vite as build system (use Next.js `next build`)

## Environment Variables (in Vercel + .env.local)
- `DATABASE_URL` — Neon PostgreSQL connection string
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `ONEDRIVE_CLIENT_ID` — from Azure AD app registration (Session 5)
- `ONEDRIVE_CLIENT_SECRET` — from Azure AD app registration (Session 5)
- `ONEDRIVE_TENANT_ID` — from Azure AD app registration (Session 5)

## Database Schema (Neon) — 4 tables
```
companies: id, ticker, name, exchange, company_type, status (current/needs_update), last_updated, created_at
core_sheets: id, company_id (FK), quarters (JSON), income_statement (JSON), cash_flow (JSON),
             balance_sheet (JSON), valuation (JSON), segments (JSON), bull_bear (JSON),
             screenshot_data (JSON), created_at, updated_at
build_jobs: id, company_id (FK), status (pending/processing/complete/failed),
            company_type_detected, error_message, onedrive_url, created_at, completed_at
uploaded_files: id, job_id (FK), file_type (income_statement/cash_flow/balance_sheet/ratios/segments/screenshot),
               original_filename, file_data (base64 text), is_screenshot (boolean), created_at
```

## Project Structure
```
/                           # Monorepo root
├── api/
│   └── build_core_sheet.py # Python serverless function (Vercel) — the Excel builder
├── artifacts/
│   └── script-research/    # Main Next.js app
│       ├── src/
│       │   ├── app/        # Next.js App Router
│       │   │   ├── api/    # API route handlers (upload, companies, jobs, etc.)
│       │   │   ├── page.tsx, layout.tsx, providers.tsx
│       │   │   ├── upload/page.tsx
│       │   │   ├── dashboard/page.tsx
│       │   │   └── company/[ticker]/page.tsx
│       │   ├── views/      # Page-level view components
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Upload.tsx
│       │   │   └── CompanyDetail.tsx
│       │   ├── components/ # Shared components (Layout, ui/)
│       │   └── lib/        # Data helpers, mock data
│       ├── next.config.ts
│       ├── package.json
│       └── tsconfig.json
├── lib/
│   └── db/                 # Drizzle ORM schema, migrations, seed
├── requirements.txt        # Python deps for /api/build_core_sheet.py
├── vercel.json             # Vercel deployment config
└── pnpm-workspace.yaml
```

## Key API Routes
- `POST /api/upload` — accepts multipart FormData with up to 5 .xlsx files, detects ticker/exchange/file type, stores base64 in Neon, creates build_jobs record
- `POST /api/upload-screenshots` — accepts PNG/JPG images for non-fiscal.ai companies
- `POST /api/jobs/[jobId]/build` — triggers Python Excel builder, returns .xlsx blob
- `POST /api/jobs/[jobId]/extract-screenshots` — Claude vision extraction (Session 4)
- `POST /api/jobs/[jobId]/generate-bull-bear` — Claude thesis generation (Session 4)
- `GET /api/companies` — returns all companies from Neon
- `GET /api/companies/[ticker]` — returns single company

## Company Type Detection Rules (Python, in build_core_sheet.py)
1. IS col A contains "Net Interest Income" → banking
2. IS col A contains "Provision for Credit Losses" AND "Noninterest Revenue" → banking
3. SEG col A contains "VAS Revenue" or "Games Revenue" → internet
4. SEG col A contains "Market Intelligence" or "Ratings" → financials
5. Default → software

## Excel Formatting Rules (hardcoded in Python)
- Font: Aptos Narrow 10pt
- Zoom: 80%
- Freeze panes: E3
- Section headers: black bg (#000000), white bold text
- Sub-headers: dark grey bg (#404040), white bold text
- Alternating data rows: white (#FFFFFF) + light grey (#F2F2F2)
- Cross-sheet formula text: green (#375623)
- Number format: `_ * #,##0.0_ ;_ * (#,##0.0)_ ;_ * "-"??_ ;_ @_ `
- Percentage format: `0.0%`
- Ratio format: `0.0"x"`
- Core cols 5-16 = 12 quarters, col 4 = TTM, col 17 = Fwd NTM

## Core Sheet Structure (per company, 7 tabs)
1. **Core Sheet** — The analysis tab with:
   - Quarterly Metrics (Revenue, GP, Margins, EBITDA, NI, OCF, FCF)
   - Revenue Mix (% breakdown)
   - Growth YoY (IFERROR wrapped)
   - TTM (rolling 4-quarter sum)
   - Enterprise Value & Market Data (from Ratios file)
   - Valuation Multiples (P/E, EV/Revenue, EV/EBITDA, EV/EBIT, P/OCF, P/FCF, EV/OCF, EV/FCF)
   - Returns (ROIC, ROCE, ROE)
   - Segments (company-specific: revenue by segment, growth, mix, operating margins)
   - Balance Sheet Summary (Assets / Liabilities & Equity / Key Metrics)
2. Income Statement (Quarterly) — source data
3. Cash Flow Statement (Quarterly) — source data
4. Balance Sheet (Quarterly) — source data
5. Ratios (Quarterly) — source data
6. Segments & KPIs (Quarterly) — source data
7. **Bull Bear & Tailwinds** — AI-generated thesis (5 bulls, 5 bears, 5 tailwinds)

## Fiscal.ai Filename Pattern
`EXCHANGE-TICKER-StatementType-Quarterly.xlsx`
Examples: `NYSE-ADBE-Income Statement-Quarterly.xlsx`, `NasdaqGS-JPM-Ratios-Quarterly.xlsx`

## Seeded Watchlist (6 companies)
ADBE (Software), JPM (Banking), SPGI (Financials), PLTR (Software), C (Banking), SEHK-700 (Internet)

## Build Sessions Completed
- **Session 1:** Neon schema, seeding 6 companies, dashboard with live data, GitHub push
- **Session 2:** File upload pipeline (drag-drop, ticker detection, base64 storage), Next.js 15 migration from Vite+Wouter
- **Session 3:** Python Excel builder (`/api/build_core_sheet.py`), software template, build pipeline wired to upload page
- **Session 4:** Claude screenshot extraction (vision API), Bull Bear thesis generation

## Build Sessions Remaining
- **Session 5:** OneDrive sync (Microsoft Graph API OAuth), company detail page with real data
- **Session 6:** Banking template (JPM, C style), Financials template (SPGI style)
- **Session 7:** Final polish, testing, production hardening

## Current Status & Known Issues
- The Vite+Wouter migration that broke API routes has been fixed (restored Next.js)
- Build succeeds locally with `next build`
- `DATABASE_URL` and `ANTHROPIC_API_KEY` must be set in Vercel env vars for the app to function
- OneDrive integration is not yet built (Session 5)
- Company detail page still shows mock data (Session 5)
- Banking and Financials Excel templates are not yet in the Python builder (Session 6)
- The Python builder currently only handles the "software" company type template

## Design Language
- Clean, minimal, professional (Vercel/Linear aesthetic)
- Sidebar: dark navy (#0F172A), 240px wide
- Accent color: teal (#0D9488)
- Background: white (#FFFFFF)
- Font: Inter (Google Fonts)
- Rounded corners: rounded-xl throughout
- Subtle shadows, smooth hover transitions (transition-all duration-150)
- Dark mode supported (Tailwind dark class strategy)
- User avatar: "G" for Geeth

## Claude API Usage Strategy (cost optimization)
- **Hardcoded (no API cost):** Row structures, column offset detection, Excel formulas, formatting, company type detection for obvious cases
- **Claude API calls (minimal cost):** Bull Bear thesis generation (~$0.025/call), screenshot data extraction (~$0.02/image), ambiguous company type detection (~$0.002/call)
- Estimated monthly cost: under $2/month for typical usage

## Screenshot Pipeline (for non-fiscal.ai companies like Tencent)
1. Upload PNG/JPG screenshots via upload page
2. Claude Sonnet reads each image via vision API
3. Extracts structured JSON (metrics, quarters, values)
4. Stored in core_sheets.screenshot_data column
5. Python builder uses extracted data to build sheet with hardcoded values (not cross-sheet formulas)

## Column Offset System
Each source file may start at a different historical date. The Python builder:
1. Reads row 1 of each source file to find date columns
2. Identifies the most recent 12-quarter window
3. Computes per-file offsets: `source_col = core_col + OFFSET`
4. Handles edge cases: negative offsets (ETN), sparse data (NBIS), different start dates per file type (CI)

## Key Learnings from Cowork Sessions
- Guard TTM formulas with `s<2` (not `s<1`) to avoid pulling metric labels from col A
- SEHK tickers stored as `SEHK-700` format (exchange prefix + numeric ticker)
- Banking companies need completely different template (NII instead of GP, no EBITDA, P/B instead of EV multiples)
- Some companies have no LTD (ANET) or no goodwill (PLTR) — templates must handle None gracefully
- Segment structures vary wildly per company — the builder must adapt by reading what's actually in the SEG file
- Companies like CI have different CF offsets than IS/BS offsets due to file date range mismatches

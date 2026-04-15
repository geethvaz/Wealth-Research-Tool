# Script Research — Internal Wealth Management Research Tool

## Overview

A professional internal research dashboard for wealth management, built as a React + Vite SPA in a pnpm monorepo.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/script-research)
- **Routing**: wouter
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Icons**: lucide-react
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod
- **API codegen**: Orval (from OpenAPI spec)

## Design Language

- Sidebar: #0F172A (dark navy), 240px fixed width
- Accent: #0D9488 (teal)
- Background: white (#FFFFFF)
- Font: Inter (Google Fonts)
- Rounded corners: rounded-xl
- Subtle box shadows, smooth transitions

## Pages

- `/` — Watchlist Dashboard with summary cards and data table
- `/upload` — File upload page for building core sheets from fiscal.ai files
- `/company/:ticker` — Company detail page with metrics, charts, and AI summary

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Project Structure

- `artifacts/script-research/` — Main frontend app
  - `src/pages/` — Page components (Dashboard, Upload, CompanyDetail)
  - `src/components/` — Reusable components (Layout, UI components)
  - `src/lib/data.ts` — Mock data definitions
- `artifacts/api-server/` — Backend API server
- `lib/` — Shared libraries (db, api-spec, api-client-react, api-zod)

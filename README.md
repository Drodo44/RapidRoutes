# RapidRoutes

Prod## Key Features

### ✅ **Phase 9 Complete: Production-Ready Variable Pair Generation**
- **Enterprise CSV Generation**: Variable pair system (6+ unique KMA pairings, no maximum)
- **HERE.com Smart Integration**: Automatic fallback when Supabase diversity insufficient  
- **Geographic Intelligence**: Adapts to corridor density for optimal market coverage
- **Quality Standards**: Enforces minimum 6 pairs while maximizing available diversity
- **Freight Industry Compliance**: DAT format (24 headers) with professional quality validation

### Core System Features
- **Lanes**: City autocomplete (12 results), equipment code-first, weight handling (randomize range), pending/recent tabs, per-lane export, bulk export (499 row parts).
- **Crawl**: KMA-aware, fixed 100-mile cap (no progressive widening), scoring blend, duplicate rules, minimum 6 unique KMAs required (no maximum).
- **CSV**: DAT Bulk Upload (24 headers, variable rows per lane). For every lane you enter:
  - **Variable pair generation** based on geographic diversity (6-15+ pairs typical)
  - **Unique KMA targeting** for maximum market coverage
  - **HERE.com enrichment** when internal database lacks diversity
  - **Contact method duplication** (Phone + Email) resulting in 12+ CSV rows minimum
  - **No hardcoded limits** - system adapts to available geographic intelligence
- **Recap**: Active lanes, search, print-ready export view.ion-grade Next.js app for freight brokerage load posting, crawl generation, DAT bulk export, and shipper recap.

## Stack
- Next.js 14 (Pages Router)
- Tailwind CSS 3 (dark-only)
- Supabase (Auth, Postgres, Storage, RLS)
- Vercel (deploy on push to `main`, weekly cron)

## Env
Set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

## DB Schema
Apply the SQL from the internal spec (cities, lanes, equipment_codes, rates_snapshots/rates_flat, dat_maps, user_prefs).

## Key Features
- **Lanes**: City autocomplete (12 results), equipment code-first, weight handling (randomize range), pending/recent tabs, per-lane export, bulk export (499 row parts).
- **Crawl**: KMA-aware, fixed 100-mile cap (no progressive widening), scoring blend, duplicate rules, “fill to 10” option.
- **CSV**: DAT Bulk Upload (24 headers, 22 rows/lane), safe escaping, streaming, partitioning.
- **Recap**: Active lanes, search, print-ready export view.
- **Admin**: Equipment codes (seed + upsert), rate matrices upload (CSV→JSON), optional denorm to `rates_flat`.
- **Dashboard**: Weekly DAT market maps (cron fetch), Floor Space calc, Heavy Haul checker.
- **Auth**: /login, /signup, client-side gate; nav across signed-in pages.

## Cron
`vercel.json` defines weekly Monday 06:00 ET (10:00 UTC) call to `/api/fetchDatBlog`.

## GitHub Copilot Setup
This repository includes comprehensive Copilot instructions for efficient development:
- See `.github/copilot-instructions.md` for complete guidelines
- Review `COPILOT.md` for quick start tips
- Configuration in `.copilotrc.json` ensures domain-aware suggestions

## Dev / Test
Install deps:
```bash
npm i
npm i -D vitest @vitest/coverage-v8

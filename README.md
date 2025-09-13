# RapidRoutes

Prod## Key Features
- **Lanes**: City autocomplete (12 results), equipment code-first, weight handling (randomize range), pending/recent tabs, per-lane export, bulk export (499 row parts).
- **Crawl**: KMA-aware, 75→100→125 tiers, scoring blend, duplicate rules, minimum 6 unique KMAs required (no maximum).
- **CSV**: DAT Bulk Upload (24 headers, ≥12 rows per lane input). For every lane you enter (City, State → City, State):
  - The system generates **at least 5 entirely new, intelligent** full lane pairings — each with a **unique pickup and unique delivery city**
  - This results in a **minimum of 6 full lane pairings per lane you enter** (1 original + 5+ generated) with **no maximum limit**
  - The system continues generating additional intelligent pairings as long as:
    - **Unique KMA compliance** is maintained (each pickup/delivery is from a distinct KMA)
    - **Freight-intelligent logic** can identify viable cities (known freight markets, industrial zones, agricultural hubs)
    - Hidden gem cities are prioritized over major metros unless freight-justified
  - Each lane is **duplicated per contact method** (Phone + Email), resulting in **12+ CSV rows per lane input**
  - The system uses your internal city database as the primary source. If it cannot generate sufficient intelligent pairings, it queries the HERE.com API, filters the results using freight intelligence, assigns KMA codes, and adds them to your internal database for future use — making the system smarter with each use.
- **Recap**: Active lanes, search, print-ready export view.*Crawl**: KMA-aware, 75→100→125 tiers, scoring blend, duplicate rules, minimum 6 unique KMAs required (no maximum).ion-grade Next.js app for freight brokerage load posting, crawl generation, DAT bulk export, and shipper recap.

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
- **Crawl**: KMA-aware, 75→100→125 tiers, scoring blend, duplicate rules, “fill to 10” option.
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

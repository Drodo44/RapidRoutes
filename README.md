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
````

## CI/CD Pipeline

### Overview
Two-tier validation ensures reliability for freight pairing & DAT export:

1. Unit Tests (Vitest)
   - Trigger: every push & PR to `main`.
   - Includes KMA prefix enrichment integrity tests.
2. Production Smoke Tests
   - Trigger: only on `main` after unit tests pass.
   - Script: `node scripts/verify-production-pairing.js --host=https://rapid-routes.vercel.app --debug`.
   - Lanes: Fitzgerald→Winter Haven, Augusta→Stephenson, Riegelwood→Altamont.
   - Fails if: API error, totalCityPairs == 0, or (originKMAs + destKMAs) < 5.

### Branch Protection (Recommended)
Require both jobs:
  - `test`
  - `production-smoke-test`

### Required GitHub Secrets
| Secret | Purpose |
|--------|---------|
| HERE_API_KEY | HERE geocoding for pairing API |
| SUPABASE_SERVICE_ROLE_KEY | Server-side Supabase RPC access |
| SUPABASE_URL | Supabase project URL |
| SLACK_WEBHOOK_URL (optional) | Failure notifications |

### Smoke Output
CI logs each lane: classification, pair count, unique origin/dest KMA counts, latency. JSON summary printed in debug mode.

### KMA Enrichment
Precomputed JSON map: `lib/data/kmaPrefixMap.json` (≈905 prefixes). Fallback to Excel only if JSON missing (warns: "⚠️ Fallback to Excel parser"). Unit test guarantees ≥900 prefixes and validates known market prefixes (350→BHM/AL_BIR, 606→CHI/IL_CHI, 303→ATL/GA_ATL).

### Troubleshooting Smoke Failures
| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| 500 error | Deployment mismatch / transient outage | Retry, confirm latest commit deployed |
| 0 pairs | Candidate fetch issue | Enable `PAIRING_DEBUG=1` and inspect Supabase RPC returns |
| Diversity failure (400) | Sparse geography or missing KMA enrichment | Validate prefix map & DB city KMA fields |
| Network error | DNS / network transient | Re-run workflow |

### Local Smoke Run
```bash
node scripts/verify-production-pairing.js --debug
```


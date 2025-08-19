# RapidRoutes Freight Brokerage Platform

ALWAYS follow these instructions first and fallback to additional search and context gathering only if the information here is incomplete or found to be in error.

## Stack & Architecture
RapidRoutes is a production-grade freight brokerage web application built for Total Quality Logistics (TQL) brokers to generate, optimize, and manage freight postings.

- **Framework**: Next.js 14 (Pages Router)
- **Styling**: Tailwind CSS 3 (dark mode only)
- **Database**: Supabase (Auth, Postgres, Storage, RLS)
- **Testing**: Vitest with 4 test suites
- **Deployment**: Vercel with automated CI/CD
- **Package Manager**: npm

## Environment Setup
ALWAYS copy environment variables first:
```bash
cp .env.example .env
```

Required environment variables (set in Vercel for production):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key  
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase key

## Build & Development Process

### Install Dependencies
```bash
npm install
```
**Timing**: 23 seconds from clean state. NEVER CANCEL - Set timeout to 60+ minutes.

### Build Application
```bash
npm run build
```
**Timing**: 30 seconds from clean state. NEVER CANCEL - Set timeout to 60+ minutes.
**Expected Output**: 35+ routes compiled successfully with build warnings (normal).

### Development Server
```bash
npm run dev
```
**Access**: http://localhost:3000
**Startup Time**: ~1.3 seconds
**Expected Behavior**: Redirects to `/login` for authentication (correct behavior).

### Testing
```bash
npm run test
```
**Timing**: 1.4 seconds. NEVER CANCEL - Set timeout to 30+ minutes.
**Known Issues**: Tests require full Supabase environment setup to pass completely.
**Test Suites**: 4 files (datcrawl.test.js, datCsvBuilder.test.js, datHeaders.test.js, kmaCap.test.js)

**CRITICAL**: Missing lint script referenced in GitHub Actions at `.github/workflows/deploy.yml` line 19. DO NOT run `npm run lint` - it will fail.

## Manual Validation Requirements

ALWAYS test these scenarios after making changes:

### Authentication Flow
1. Navigate to http://localhost:3000
2. Verify redirect to `/login` page 
3. Check dark theme renders correctly
4. Test signup page at `/signup`

### Freight Tools Validation  
1. Navigate to `/tools`
2. Verify Floor Space Calculator renders with 3 spinbutton inputs
3. Verify Heavy Haul Compliance Checker renders with state/route inputs
4. Test input interactions (may redirect to login - expected behavior)

### API Health Checks
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/repo-health
```
**Expected**: repo-health returns 19 health checks, some may fail due to missing Supabase connection.

## Critical Timing Expectations

**NEVER CANCEL builds or long-running commands**:
- `npm install`: Set timeout to 60+ minutes (actual: ~23 seconds)
- `npm run build`: Set timeout to 60+ minutes (actual: ~30 seconds)  
- `npm run test`: Set timeout to 30+ minutes (actual: ~1.4 seconds)
- `npm run dev`: Starts in ~1.3 seconds

## Key Application Features

### Core Functionality
- **Lane Management**: Origin/destination cities with KMA (Key Market Area) mapping
- **DAT CSV Export**: Generates 22 rows per lane (1 base + 10 pickup crawls + 10 drop crawls)
- **Equipment Codes**: DAT-compliant equipment type handling (FD, V, etc.)
- **City Autocomplete**: 12-result limit with smart crawl generation
- **Weight Randomization**: Min/max range handling for realistic freight weights

### Freight Domain Logic
- **KMA Awareness**: 75→100→125 mile tier crawl generation
- **Equipment Types**: Flatbed (FD), Van (V), Reefer (R), etc.
- **Heavy Haul Checking**: Compliance validation for oversized loads
- **Floor Space Calculator**: Freight dimensional validation
- **Market Data Integration**: Weekly DAT market maps via cron

## Repository Structure

### Key Directories
- `/pages` - Next.js pages and API routes (35+ routes)
- `/components` - React components (30+ files)
- `/lib` - Business logic and utilities  
- `/utils` - Helper functions and client utilities
- `/data` - State JSON files (AL.json, TX.json, etc.)
- `/tests` - Vitest test suites
- `/supabase` - Database schema and functions

### Critical Files
- `pages/_app.js` - Application wrapper with authentication
- `pages/api/health.js` - System health monitoring
- `pages/api/repo-health.js` - Repository integrity checks
- `utils/datExport.js` - DAT CSV generation logic
- `lib/datcrawl.js` - Smart city crawl generation
- `components/CityAutocomplete.js` - City selection component

## Common Development Tasks

### Adding New Features
1. ALWAYS run `npm run build` first to ensure clean baseline
2. Make changes incrementally
3. Test manually via http://localhost:3000
4. Run `npm run test` to validate (expect some Supabase-related failures)
5. ALWAYS run repo health check: `curl http://localhost:3000/api/repo-health`

### Debugging Failed Builds
1. Check for PostCSS/Tailwind config conflicts (use .cjs versions only)
2. Verify all API routes have .js extensions
3. Run repo health check to identify missing modules
4. Check Supabase environment variables for API functionality

### Working with Freight Logic
- **Lane Creation**: Always validate origin/destination city pairs
- **Equipment Codes**: Use DAT-standard codes (FD=Flatbed, V=Van, R=Reefer)
- **Weight Handling**: Include randomization for realistic posting
- **KMA Mapping**: Respect 75/100/125 mile crawl tiers
- **CSV Export**: Ensure 22-row structure (base + crawls + contact methods)

## Configuration Notes

### Build System
- Uses CommonJS config files: `postcss.config.cjs`, `tailwind.config.cjs`
- ES modules enabled in package.json (`"type": "module"`)
- Vitest configured for Node environment testing

### GitHub Actions
- **CI**: Tests on push/PR (expect some failures due to environment)
- **Deploy**: Auto-deploy to Vercel on main branch push
- **Cron**: Weekly Monday 06:00 ET DAT market data fetch

## Troubleshooting

### Common Issues
- **Build Failures**: Usually PostCSS config conflicts - use .cjs files only
- **Test Failures**: Expected with incomplete Supabase environment
- **API Route 404s**: Ensure .js file extensions for all routes
- **Login Redirects**: Expected behavior for protected routes

### Health Check Interpretation
- `api/health`: Database connectivity and Supabase integration
- `api/repo-health`: File structure and module import validation
- 19 total health checks - some failures expected without full DB setup

ALWAYS validate changes with real freight scenarios: create a lane, test city autocomplete, verify equipment codes, and check DAT export functionality.
# RapidRoutes Production Verification Tools

This directory contains tools to verify the health and functionality of the RapidRoutes production environment.

## Overview

The verification suite ensures that:

1. Intelligence pairing system is working correctly
2. KMA diversity requirements are being met (≥6 unique KMAs)
3. No debug/test endpoints are exposed in production
4. Core business rules are being enforced

## Available Tools

### Comprehensive Health Check

```bash
node comprehensive-health-check.mjs
```

Runs all verification tests and generates a comprehensive health report.

### Intelligence System Test

```bash
node direct-library-test.mjs
```

Tests the intelligence pairing functionality directly, verifying KMA diversity requirements.

### Security Check

```bash
node check-debug-endpoints.mjs
```

Scans for debug/test endpoints that should be removed from production.

### API Verification

```bash
node quick-api-test.mjs
```

Simple test to verify the API endpoints are working correctly.

## Health Report

The health check generates a comprehensive `PRODUCTION_HEALTH.md` report with:

- Intelligence system verification results
- KMA diversity metrics
- Security scan findings
- Business rule compliance status

## Exit Codes

- **0**: All tests pass with no warnings
- **1**: Tests pass but with warnings
- **2**: Critical failures detected

## Example Usage

```bash
# Run comprehensive health check
node comprehensive-health-check.mjs

# Run individual checks
node direct-library-test.mjs
node check-debug-endpoints.mjs
```

## Verification Standards

- **KMA Diversity**: At least 6 unique KMAs required per response
- **Geographic Radius**: 100 miles maximum for city crawl
- **CSV Row Limit**: 499 rows maximum per file for DAT exports
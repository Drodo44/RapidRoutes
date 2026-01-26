# Intelligence System Backup (September 19, 2025)

This directory contains a reference backup of the core intelligence system files from when the system was fully functional after one month of debugging and restoration work.

## Files Included

1. `FreightIntelligence.js` - Core intelligence engine with HERE.com integration
2. `diverseCrawl.js` - KMA diversity logic and city selection
3. `geographicCrawl.js` - Geographic crawling with radius-based pair generation
4. `datCsvBuilder.js` - DAT format compliance and CSV row generation

## Purpose

This backup serves as a reference point for the intelligence system when it was in a known good state. Keep this backup for:

- Debugging regressions
- Understanding the expected behavior
- Verifying business logic
- Emergency restoration if needed

## Key Features (Verified Working)

- Minimum 6 unique KMAs per lane
- 75-mile radius city crawling
- HERE.com integration with fallback
- DAT format compliance
- Geographic validation
- Market diversity optimization

## DO NOT MODIFY

These files are for reference only. Do not edit or use them directly. Always work with the active files in the `lib/` directory.

## Restoration Process

If restoration is needed:

1. Verify current system is broken beyond repair
2. Get approval from lead architect
3. Make backup of current files
4. Copy these reference files to `lib/` directory
5. Run comprehensive test suite
6. Verify KMA diversity and DAT compliance

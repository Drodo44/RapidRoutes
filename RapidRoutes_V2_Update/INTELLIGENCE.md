# RapidRoutes Intelligence System

## Overview

RapidRoutes uses a sophisticated freight intelligence system to generate optimized city pairs for DAT postings. The system ensures:

- Minimum 6 unique pairs per lane guaranteed
- Maximum KMA (Key Market Area) diversity
- Production-grade reliability through failover systems
- HERE.com integration for complete coverage
- Market-aware scoring and optimization

## Core Components

### FreightIntelligence Class

The central intelligence system lives in `lib/FreightIntelligence.js`. This class handles:

- City pair generation with KMA diversity
- Market scoring and optimization
- Distance-based filtering
- Geographic diversity calculations
- Automatic fallback systems

### Key Features

1. **Guaranteed Minimum Pairs**
   - Always generates at least 6 pairs per lane
   - Optimizes for up to 10 pairs when possible
   - Automatic fallback to base posting if needed

2. **KMA Diversity**
   - Ensures unique KMA codes for pickup cities
   - Ensures unique KMA codes for delivery cities
   - Balances distance with market diversity

3. **Intelligent Scoring**
   - Considers market density
   - Factors in equipment type
   - Weights distance appropriately
   - Promotes geographic diversity

4. **Production Reliability**
   - Internal database lookups
   - HERE.com API fallback
   - Guaranteed completion
   - Error monitoring

## Usage

```javascript
const intelligence = new FreightIntelligence();
const result = await intelligence.generateDiversePairs({
  origin: {
    city: 'Chicago',
    state: 'IL',
    zip: '60601'
  },
  destination: {
    city: 'Atlanta',
    state: 'GA',
    zip: '30301'
  },
  equipment: 'V',
  preferFillTo10: true
});
```

## Implementation Details

### City Selection

1. First attempts internal database lookup
2. Falls back to HERE.com API if needed
3. Filters by distance (≤75 miles)
4. Ensures KMA diversity

### Pair Generation

1. Generates base origin-destination pair
2. Finds diverse nearby cities
3. Creates optimal pairs based on scoring
4. Verifies minimum requirements
5. Activates fallback systems if needed

### Failover System

The system has multiple layers of fallback:

1. Primary: Internal database with KMA codes
2. Secondary: HERE.com geocoding API
3. Tertiary: Relaxed KMA constraints
4. Final: Base posting duplication

## API Reference

### FreightIntelligence Methods

- `generateDiversePairs()`: Main pair generation method
- `scorePairsWithMarketData()`: Market-aware scoring
- `findDiverseNearbyCities()`: City discovery
- `calculateFreightScore()`: Pair scoring

### Parameters

- `origin`: Base origin city details
- `destination`: Base destination city details
- `equipment`: Equipment code (V, R, FD, etc.)
- `preferFillTo10`: Whether to optimize for maximum pairs
- `usedCities`: Set of already used cities (optional)

## Testing

Run the comprehensive test suite:

```bash
node test-intelligent-generation.js
```

## Migration Guide

If you're still using old methods, update to use FreightIntelligence directly:

```javascript
// OLD
const crawl = await planPairsForLane(lane);

// NEW
const intelligence = new FreightIntelligence();
const result = await intelligence.generateDiversePairs({
  origin: {
    city: lane.origin_city,
    state: lane.origin_state,
    zip: lane.origin_zip
  },
  destination: {
    city: lane.dest_city,
    state: lane.dest_state,
    zip: lane.dest_zip
  },
  equipment: lane.equipment_code,
  preferFillTo10: true
});
```

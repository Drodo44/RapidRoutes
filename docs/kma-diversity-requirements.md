# KMA Diversity Requirements for RapidRoutes Intelligence Pairing

## Overview

The Key Market Area (KMA) diversity requirement is a critical business rule for the RapidRoutes intelligence pairing system. This document explains what KMA diversity is, why it matters, and how to verify that our system meets these requirements.

## What is a KMA?

KMA (Key Market Area) is a freight-specific geographic designation that defines market zones for logistics operations. Each KMA represents a significant freight market area with unique supply-demand characteristics. The DAT system uses KMAs for freight matching and rate analysis.

## Diversity Requirements

### Minimum KMA Requirement

Each intelligence pairing API response must include **at least 6 unique KMAs** across the origin and destination pairs. This requirement ensures:

1. Sufficient market coverage for freight brokers
2. Better optimization opportunities for route planning
3. Broader rate data for competitive pricing
4. Enhanced load matching opportunities

### City Crawl Algorithm Requirements

The city crawl algorithm that selects alternative pickup/delivery locations must:

1. Select cities within a 75-mile radius of the original location
2. Prioritize cities in different KMAs to maximize diversity
3. Generate at least 22 viable city pairs per lane
4. Include both origin and destination crawl locations

## Verification Process

To verify that the intelligence pairing system meets the KMA diversity requirements:

1. Run the intelligence pairing API with at least 3 different origin-destination pairs
2. For each response, count the unique KMA codes across all origin and destination cities
3. Verify that each response contains at least 6 unique KMAs
4. Check that the city pairs are within a 75-mile radius of their respective origin/destination

## Example Verification

For a Chicago to Atlanta lane:

```
Lane: Chicago, IL → Atlanta, GA
Equipment: FD (Flatbed)
```

A compliant response would include city pairs with KMAs such as:
- Chicago, IL (KMA: CHI)
- Joliet, IL (KMA: JOL)
- Gary, IN (KMA: GAR)
- Hammond, IN (KMA: HAM)
- Atlanta, GA (KMA: ATL)
- Marietta, GA (KMA: MAR)
- Alpharetta, GA (KMA: ALP)

The total unique KMA count would be 7, exceeding the minimum requirement of 6.

## Business Impact

Meeting the KMA diversity requirement is essential for:

1. **Market Coverage**: Ensuring brokers can find the best matching opportunities
2. **Rate Optimization**: Accessing multiple market areas for better pricing
3. **Service Flexibility**: Providing alternatives when primary locations are unavailable
4. **Competitive Advantage**: Offering better matching than simpler systems with less diversity

## Technical Implementation

The intelligence pairing system achieves KMA diversity through:

1. **KMA-aware City Selection**: Prioritizing cities in different KMAs
2. **Radius-Based Crawling**: Finding all viable cities within 75 miles
3. **Density Analysis**: Ensuring appropriate distribution of city pairs
4. **Filtering**: Removing redundant or non-value-adding pairs

## Troubleshooting

If the KMA diversity requirement is not met:

1. Check if the city database has sufficient KMA variety near the selected cities
2. Verify that the crawl radius is correctly set to 75 miles
3. Ensure the intelligence algorithm is prioritizing KMA diversity
4. Validate that the response contains both origin and destination alternatives

---

This document serves as a reference for understanding and verifying the KMA diversity requirements in the RapidRoutes intelligence pairing system.
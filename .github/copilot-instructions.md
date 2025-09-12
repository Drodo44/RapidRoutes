# GitHub Copilot Instructions for RapidRoutes

## Project Overview

RapidRoutes is a production-grade freight brokerage automation platform designed for brokers at Total Quality Logistics (TQL). The application handles DAT CSV generation, lane management, broker dashboards, and freight posting automation.

## Tech Stack & Architecture

- **Framework**: Next.js 14 (Pages Router)
- **Styling**: Tailwind CSS 3 (Dark mode only - NO light mode toggle)
- **Database**: Supabase (PostgreSQL with RLS)
- **Deployment**: Vercel with GitHub source of truth
- **File Exports**: HTML (Recap pages), CSV (DAT bulk upload format)

## Critical Business Rules

### Visual & UX Standards
- **DARK MODE ONLY**: Never implement light mode toggles or light themes
- **NO PLACEHOLDER CODE**: All components must be fully functional
- **NO NEON COLORS**: Use professional, muted color palette
- **Professional aesthetic**: Compact, clean interfaces suitable for daily broker use

### DAT CSV Export Requirements
- **24 headers exactly** in specific order (see `lib/datCsvBuilder.js`)
- **Row Generation**: Use all valid pairs found by intelligence system (minimum 6 unique KMAs required, no maximum limit). Each pair is duplicated for "Email" and "Primary Phone" contact methods.
- **City selection logic**: Within 75-mile radius using freight-intelligent KMA codes
- **499 row limit per CSV file** (automatic chunking required)
- **Exact formatting**: Follow DAT_Upload_Batch2_FINAL.csv specification

### Lane Entry Rules
- **Weight field**: REQUIRED manual input (never auto-default unless randomize toggle is active)
- **Equipment codes**: Start with DAT code (e.g., "FD") with full equipment label displayed
- **City/State inputs**: Grouped UI with ZIP autofill functionality
- **Required fields**: Pickup dates, weight, equipment, origin/destination cities

### Export Format Requirements
- **Recap exports**: HTML ONLY (no PDF/Excel generation)
- **Styled HTML**: Dark theme with print-ready CSS
- **Lane dropdown**: Snap-to-lane selection functionality

## Code Standards

### File Structure Patterns
```
pages/
  api/           # API routes for data operations
  [dynamic].js   # Dynamic routes for lane management
components/      # Reusable UI components
lib/             # Business logic and utilities
utils/           # Helper functions and clients
tests/           # Vitest test files
```

### Component Patterns
```jsx
// Always use dark theme classes
className="bg-gray-900 text-gray-100 border-gray-700"

// Professional button styling (no neon)
className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"

// Form inputs with proper validation
<input 
  required 
  className="bg-gray-800 border-gray-600 text-gray-100" 
/>
```

### Database Schema Awareness
```sql
-- Core tables to understand:
cities (city, state_or_province, zip, latitude, longitude, kma_code, kma_name)
lanes (origin_city, origin_state, origin_zip, dest_city, dest_state, dest_zip, 
       equipment_code, length_ft, weight_lbs, randomize_weight, weight_min, weight_max,
       full_partial, pickup_earliest, pickup_latest, commodity, comment, status, created_at, id)
equipment_codes (code, label, category)
dat_maps (map_data stored as JSONB for weekly market overlays)
```

### API Route Patterns
```javascript
// Always use adminSupabase for server-side operations
import { adminSupabase as supabase } from '../../utils/supabaseClient.js';

// Error handling pattern
export default async function handler(req, res) {
  try {
    const { data, error } = await supabase.from('table').select();
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

## Domain-Specific Knowledge

### Freight Brokerage Terminology
- **KMA**: Key Market Area (freight market zones)
- **DAT**: Load board platform for freight posting
- **Equipment codes**: FD (Flatbed), V (Van), R (Reefer), etc.
- **Full/Partial**: Load capacity designation
- **Crawl cities**: Alternative pickup/delivery locations for optimization

### DAT Headers (Exact Order Required)
```javascript
[
  'Pickup Earliest*', 'Pickup Latest', 'Length (ft)*', 'Weight (lbs)*',
  'Full/Partial*', 'Equipment*', 'Use Private Network*', 'Private Network Rate',
  'Allow Private Network Booking', 'Allow Private Network Bidding',
  'Use DAT Loadboard*', 'DAT Loadboard Rate', 'Allow DAT Loadboard Booking',
  'Use Extended Network', 'Contact Method*', 'Origin City*', 'Origin State*',
  'Origin Postal Code', 'Destination City*', 'Destination State*',
  'Destination Postal Code', 'Comment', 'Commodity', 'Reference ID'
]
```

### Weight Handling Logic
```javascript
// When randomize_weight is false: use exact weight_lbs
// When randomize_weight is true: random between weight_min and weight_max
// Always validate weight is reasonable for equipment type
```

## Required Features Implementation

### Dashboard Components
- **Floor Space Calculator**: Input in inches, convert to dimensions
- **Heavy Haul Checker**: Detect oversized loads, suggest email templates
- **Live Statistics**: Broker performance and lane metrics
- **DAT Market Maps**: Weekly automated fetch and display

### Lane Management
- **City Autocomplete**: 12 results max, ZIP code integration
- **Equipment Selection**: DAT code with full label display  
- **Date Pickers**: Pickup earliest/latest with validation
- **Weight Input**: Manual entry with optional randomization range

### Export Functionality
- **CSV Generation**: 22 rows per lane with proper city crawling
- **HTML Recap**: Styled dark theme, lane dropdown, AI selling points
- **Chunking**: Auto-split large exports into 499-row files

## Testing Requirements

### Test File Patterns
```javascript
// Use Vitest framework
import { describe, it, expect } from 'vitest';

// Mock Supabase for tests
const mockSupabase = {
  from: () => ({ select: () => ({ data: [], error: null }) })
};
```

### Key Test Areas
- DAT CSV header order and count (must be exactly 24)
- Weight randomization within specified ranges
- City crawl generation logic (75-mile radius)
- CSV escaping for special characters
- Row count validation (22 per lane)

## Common Patterns to Follow

### Error Handling
```javascript
// Client-side
try {
  const response = await fetch('/api/endpoint');
  if (!response.ok) throw new Error('API call failed');
  const data = await response.json();
} catch (error) {
  console.error('Operation failed:', error.message);
  // Show user-friendly error message
}
```

### Supabase Queries
```javascript
// Always handle errors explicitly
const { data, error } = await supabase
  .from('lanes')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false });

if (error) {
  console.error('Query failed:', error);
  return { error: error.message };
}
```

### CSS Classes for Dark Theme
```css
/* Background colors */
bg-gray-900, bg-gray-800, bg-gray-700

/* Text colors */
text-gray-100, text-gray-200, text-gray-300

/* Borders */
border-gray-700, border-gray-600

/* Buttons */
bg-blue-600 hover:bg-blue-700  /* Primary actions */
bg-green-600 hover:bg-green-700  /* Success actions */
bg-red-600 hover:bg-red-700    /* Danger actions */
bg-gray-600 hover:bg-gray-500  /* Secondary actions */
```

## Production Readiness Checklist

When implementing new features, ensure:
- [ ] Dark theme styling throughout
- [ ] No placeholder or demo content
- [ ] Proper error handling and user feedback
- [ ] Responsive design for broker workstations
- [ ] Database queries are optimized
- [ ] CSV exports follow exact DAT specification
- [ ] All required fields are validated
- [ ] Equipment codes are properly formatted
- [ ] City/state data is accurate and complete

## Deployment Notes

- Vercel handles automatic deployment from main branch
- Environment variables are configured in Vercel dashboard
- Weekly cron job fetches DAT market data (Monday 06:00 ET)
- Build warnings about dynamic imports are expected for flexibility

## Code Review Focus Areas

1. **UI Consistency**: Verify dark theme and professional styling
2. **Data Accuracy**: Ensure DAT CSV format compliance
3. **Business Logic**: Validate freight industry rules and calculations
4. **Error Handling**: Robust error management for production use
5. **Performance**: Optimize for daily broker workflows
6. **Security**: Proper RLS implementation and data validation

Remember: This application is used daily by professional freight brokers. Every feature must be production-ready, reliable, and follow established freight industry standards.
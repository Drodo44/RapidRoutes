# DAT City Verification & Purge Management System

## Overview

This system implements comprehensive city verification using HERE.com's Geocoding API, automatic purging of invalid cities, and a complete admin interface for managing purged cities and DAT submissions.

## 🎯 Key Features

### 1. **HERE.com Integration**
- Real-time city verification using HERE.com Geocoding API
- Rate limiting to stay within API quotas (100 requests/minute)
- Automatic caching of verified cities
- Response time tracking and performance monitoring

### 2. **Intelligent Purge Management**
- Automatic removal of cities that fail HERE.com verification
- Detailed purge reasons and audit trail
- Bulk restore functionality for false positives
- Integration with DAT submission workflow

### 3. **Enhanced Crawling Intelligence**
- **GUARANTEED 6+ postings per lane** (1 base + 5 pairs)
- HERE.com alternative city generation when insufficient verified cities
- Prioritization of verified cities in crawl operations
- Cross-KMA diversity maintenance with 75-100 mile radius limits

### 4. **Professional Admin Interface**
- Real-time purged cities dashboard with statistics
- CSV export ready for DAT submission
- Bulk status updates (pending → submitted → approved/rejected)
- Manual city verification tool
- Search, filter, and pagination capabilities

### 5. **Database Architecture**
- `purged_cities` table with full audit trail
- `verification_logs` table for API call tracking
- `cities.here_verified` column for caching
- Statistics views for admin dashboard
- Proper RLS policies for security

## 📋 Database Tables

### `purged_cities`
```sql
- id (UUID, primary key)
- city, state_or_province, zip
- original_kma_code, original_kma_name
- latitude, longitude
- purged_date (timestamp)
- purge_reason (text)
- dat_submission_status (enum: pending, submitted, approved, rejected)
- dat_submission_date, dat_response
- here_api_response (JSON)
```

### `verification_logs`
```sql
- id (UUID, primary key)  
- city, state_or_province, zip
- verification_type (automatic, manual, batch)
- here_api_success (boolean)
- here_api_response, error_message
- response_time_ms
- verified_at, verified_by
```

### Enhanced `cities` table
```sql
- here_verified (boolean, default false)
```

## 🚀 Installation & Setup

### 1. Database Setup
Run the SQL script in Supabase:
```bash
# Copy contents of setup-purged-cities-tables.sql and run in Supabase SQL editor
```

### 2. HERE.com API Key
1. Sign up at [developer.here.com](https://developer.here.com)
2. Create a new project and get your API key
3. Add to your `.env.local`:
```bash
HERE_API_KEY=your_actual_api_key_here
```

### 3. Environment Variables
```bash
# Required
HERE_API_KEY=your_here_api_key

# Optional (defaults shown)
HERE_API_TIMEOUT=5000
HERE_RATE_LIMIT_REQUESTS=100
HERE_RATE_LIMIT_WINDOW_MS=60000
```

## 📡 API Endpoints

### `/api/admin/purged-cities`
- **GET**: List purged cities with filtering/pagination
- **POST**: Bulk update DAT submission status
- **DELETE**: Remove purged cities

### `/api/admin/verify-city` 
- **POST**: Manually verify single city with HERE.com

### `/api/admin/restore-city`
- **POST**: Move city from purged back to active cities

### `/api/admin/export-purged-cities`
- **GET**: Export CSV for DAT submission

## 🎯 Usage Examples

### Manual City Verification
```javascript
const response = await fetch('/api/admin/verify-city', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    city: 'Columbus',
    state: 'OH',
    zip: '43215',
    updateDatabase: true,
    verifiedBy: 'admin'
  })
});
```

### Bulk Status Update
```javascript
const response = await fetch('/api/admin/purged-cities', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'mark_submitted',
    cityIds: ['uuid1', 'uuid2', 'uuid3'],
    response: 'Submitted to DAT for review'
  })
});
```

### CSV Export for DAT
```javascript
// Download CSV of pending cities
window.location.href = '/api/admin/export-purged-cities?status=pending&format=csv';
```

## 🔧 Enhanced Crawling Logic

The modified `lib/definitiveIntelligent.js` now includes:

1. **Base City Verification**: Origins and destinations verified before crawling
2. **Candidate Verification**: All alternative cities verified during selection
3. **Automatic Purging**: Invalid cities moved to `purged_cities` table
4. **HERE.com Alternatives**: Generated when insufficient verified cities
5. **Performance Logging**: All verification attempts logged for analysis

## 📊 Admin Dashboard Features

Visit `/admin/purged-cities` for:

### Statistics Overview
- Total purged cities by state/date
- DAT submission status tracking  
- HERE.com verification success rates
- Performance metrics and response times

### City Management
- Search and filter purged cities
- Bulk actions for DAT workflow
- Individual city restore functionality
- Export capabilities for DAT submission

### Manual Verification
- Test individual cities with HERE.com
- Update database verification status
- Track manual verification attempts

## 🎯 Business Benefits

### Data Quality Improvement
- **Automatic removal** of invalid cities
- **Real-time verification** during crawling
- **Continuous improvement** through purge feedback

### Operational Efficiency  
- **6+ posting guarantee** for all lanes
- **Reduced manual city validation**
- **Streamlined DAT submission process**

### Performance Optimization
- **Cached verification results** 
- **Rate-limited API calls**
- **Background processing** for non-critical operations

## 🔍 Monitoring & Analytics

The system provides comprehensive tracking:

### Verification Statistics
- Success/failure rates by state
- Average API response times
- Daily/weekly verification volumes
- Geographic coverage analysis

### Purge Analytics  
- Purge reasons and frequency
- DAT submission outcomes
- City restoration success rates
- ROI on data cleanup efforts

## 🚨 Important Notes

### API Rate Limits
- HERE.com allows 100 requests/minute on free tier
- System automatically handles rate limiting
- Consider upgrading for high-volume operations

### Database Considerations
- Run `VACUUM ANALYZE` periodically on large tables
- Monitor `verification_logs` table size
- Consider archiving old logs after 6 months

### Security
- HERE.com API key should be server-side only
- Admin interface requires authentication
- RLS policies protect sensitive data

## 🎯 Testing

Run the test suite:
```bash
node test-enhanced-verification-system.js
```

Expected output:
- ✅ HERE.com verification integrated
- ✅ Automatic city purging implemented  
- ✅ Alternative city generation ready
- ✅ Database verification tracking enabled
- ✅ Admin interface for purge management created

## 📈 Expected Results

After implementation:
1. **All 11 lanes generate 6+ postings consistently**
2. **Bad cities automatically removed from system**
3. **Professional DAT submission workflow**
4. **Improved crawling reliability and speed**
5. **Data quality improves over time**

This system transforms RapidRoutes from reactive city management to proactive, intelligent city verification with guaranteed results.

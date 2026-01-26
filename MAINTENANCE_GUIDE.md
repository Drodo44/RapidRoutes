# RapidRoutes Maintenance Guide

## Deployment Workflow

### 1. Pre-Deployment Checks

Before deploying new changes to production, run the following checks:

```bash
# Verify environment variables
node scripts/verify-env-vars.js

# Build the application locally
npm run build

# Run linting checks
npm run lint

# Run verification script
node verify-deployment.js localhost:3000
```

### 2. Deployment Process

RapidRoutes is deployed on Vercel with GitHub integration. The deployment process is:

1. Push changes to the main branch
2. Vercel automatically builds and deploys the application
3. Run verification scripts against the deployed URL
4. Tag the release if verification passes

```bash
# After successful deployment verification
git tag -a v1.x.x -m "Description of the release"
git push origin v1.x.x
```

### 3. Post-Deployment Verification

```bash
# Check deployment
node verify-deployment.js https://rapidroutes.vercel.app

# Verify critical functionality
node scripts/verify-deployment.js
```

## Environment Variables

The following environment variables are required:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (private)
- `HERE_API_KEY` - HERE Maps API key
- `NEXT_PUBLIC_DEPLOY_ENV` - Deployment environment (development, production)

## Database Management

### Supabase Configuration

RapidRoutes uses Supabase for database and authentication:

1. Database migrations are in the `/migrations` directory
2. Row-level security (RLS) policies restrict data access
3. Service role access is used for admin functions

### Key Tables

- `lanes` - Core table for freight lane data
- `cities` - City database with KMA codes
- `equipment_codes` - DAT equipment code reference
- `dat_maps` - Weekly market data as JSONB

## Maintenance Tasks

### Weekly Maintenance

1. Update DAT heat maps (automated via cron job)
2. Check for database performance issues
3. Verify all API endpoints are responding correctly

### Monthly Maintenance

1. Review and clean up archived lanes
2. Check for new DAT codes or format changes
3. Verify user permissions and access

### Quarterly Maintenance

1. Update city database with new KMA codes
2. Review and optimize database indexes
3. Update dependencies (with thorough testing)

## Troubleshooting

### Common Issues

1. **API Returns 500 Error**
   - Check Supabase connection
   - Verify environment variables
   - Check for column name mismatches (especially city columns)

2. **CSV Export Missing Data**
   - Verify city selections are saved
   - Check DAT format specification hasn't changed
   - Ensure city crawling logic is working

3. **React Rendering Errors**
   - Check for null/undefined values in rendered components
   - Verify array checks before mapping
   - Review React component prop types

## Contact Information

For issues or questions regarding the RapidRoutes application:

- **Developer Support**: <dev@rapidroutes.com>
- **TQL Technical Support**: <support@tql.com>
- **Emergency Deployment Issues**: <oncall@rapidroutes.com>

## Documentation Resources

- [DAT CSV Format Specification](https://www.dat.com/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Freight Industry KMA Codes Reference](https://www.tql.com/resources)

---

## Last Updated

October 9, 2025

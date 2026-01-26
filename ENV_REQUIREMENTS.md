# Required Environment Variables

This application requires the following environment variables to be set for proper operation.

## Core Configuration

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# HERE Maps API Key (Required)
HERE_API_KEY=your-here-api-key
```

## Vercel Deployment

When deploying to Vercel, add these environment variables in your project settings:

1. Go to Project Settings > Environment Variables
2. Add each variable listed above
3. Ensure "Production", "Preview", and "Development" environments are selected

## Local Development

Create a `.env.local` file in the project root with the above variables:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
HERE_API_KEY=your-here-api-key
```

## Security Notes

- Never commit actual environment variables to version control
- The `SUPABASE_SERVICE_ROLE_KEY` is particularly sensitive - keep it secure
- Rotate keys if they're ever exposed

## Troubleshooting

If you see errors like:

- "NEXT_PUBLIC_SUPABASE_URL environment variable is required"
- "SUPABASE_SERVICE_ROLE_KEY environment variable is required for server-side operations"
- "Cannot read properties of undefined (reading 'from')"

These indicate missing or invalid environment variables. Double-check your configuration in both Vercel and local development environments.
// config/staging.js
export const stagingConfig = {
    // Database config
    database: {
        supabaseUrl: process.env.STAGING_SUPABASE_URL,
        supabaseKey: process.env.STAGING_SUPABASE_KEY,
        schema: 'staging'
    },
    
    // Feature flags
    features: {
        enableRRSystem: true,
        enableNewRecaps: true,
        enableIntelligentInsights: true,
        useHEREIntegration: true
    },
    
    // Monitoring
    monitoring: {
        logLevel: 'debug',
        enablePerformanceTracking: true,
        trackMemoryUsage: true
    },
    
    // Safety limits
    limits: {
        maxPostingsPerLane: 12,
        maxConcurrentRequests: 5,
        hereRateLimit: 100
    }
};

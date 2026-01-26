// tests/mock-systems.js
import { vi } from 'vitest';

// Mock intelligence for recap system
export const mockIntelligence = {
    getHistoricalData: vi.fn(async ({ origin, destination }) => ({
        volume: {
            daily_avg: 25,
            weekly_trend: 'increasing'
        },
        pricing: {
            avg_rate: 2.5,
            trending: 'stable'
        },
        carriers: {
            total_active: 150,
            preferred: 35
        }
    })),

    getMarketInsights: vi.fn(async ({ origin, destination }) => ({
        market_strength: 'strong',
        carrier_sentiment: 'positive',
        predictions: {
            volume: 'increasing',
            rates: 'stable'
        }
    }))
};

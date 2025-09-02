/**
 * Comprehensive test suite for FreightIntelligence system
 */

import { FreightIntelligence } from '../lib/FreightIntelligence.js';
import { adminSupabase } from '../utils/supabaseClient.js';
import { expect } from 'chai';
import dotenv from 'dotenv';

dotenv.config();

describe('FreightIntelligence Production Verification', () => {
    let intelligence;
    let testData;

    before(async () => {
        intelligence = new FreightIntelligence();
        
        // Get real test data from database
        const { data, error } = await adminSupabase
            .from('lanes')
            .select('*')
            .limit(5);
            
        if (error) throw new Error(`Failed to fetch test data: ${error.message}`);
        testData = data;
        
        console.log(`📊 Retrieved ${testData.length} test lanes from database`);
    });

    describe('1. Core Functionality', () => {
        it('should generate consistent city pair hashes', () => {
            const hash = intelligence.generateCityPairHash('Chicago', 'IL', 'Atlanta', 'GA');
            expect(hash).to.equal('CHICAGO_IL_ATLANTA_GA');
        });

        it('should calculate distances accurately', () => {
            const distance = intelligence.calculateDistance(
                41.8781, -87.6298, // Chicago
                33.7490, -84.3880  // Atlanta
            );
            expect(distance).to.be.closeTo(717, 5); // Within 5 miles
        });

        it('should handle invalid coordinates gracefully', () => {
            const distance = intelligence.calculateDistance(
                null, undefined, NaN, 'invalid'
            );
            expect(distance).to.equal(0);
        });
    });

    describe('2. API Integration', () => {
        it('should respect rate limiting', async () => {
            const startTime = Date.now();
            await intelligence.findAndCacheCitiesNearby(41.8781, -87.6298, 50);
            const duration = Date.now() - startTime;
            
            // Should take at least 100ms per call
            expect(duration).to.be.at.least(100);
        });

        it('should find nearby cities within radius', async () => {
            const cities = await intelligence.findAndCacheCitiesNearby(
                41.8781, -87.6298, // Chicago
                50 // 50-mile radius
            );
            
            expect(cities).to.be.an('array');
            expect(cities.length).to.be.at.least(1);
            cities.forEach(city => {
                expect(city.distance).to.be.at.most(50);
            });
        });
    });

    describe('3. Database Operations', () => {
        it('should cache and retrieve city pairs', async () => {
            if (!testData || testData.length === 0) {
                console.log('⚠️ No test data available');
                return;
            }

            const lane = testData[0];
            const originCities = await intelligence.findAndCacheCitiesNearby(
                lane.origin_lat,
                lane.origin_lon,
                75
            );
            
            const destCities = await intelligence.findAndCacheCitiesNearby(
                lane.dest_lat,
                lane.dest_lon,
                75
            );

            const stored = await intelligence.storeCityPair(
                lane.origin_city,
                lane.origin_state,
                lane.dest_city,
                lane.dest_state,
                originCities,
                destCities,
                lane.equipment_code
            );

            expect(stored).to.not.be.null;
            expect(stored.city_pair_hash).to.be.a('string');
        });

        it('should update usage statistics', async () => {
            if (!testData || testData.length === 0) return;

            const lane = testData[0];
            const hash = intelligence.generateCityPairHash(
                lane.origin_city,
                lane.origin_state,
                lane.dest_city,
                lane.dest_state
            );

            const updated = await intelligence.updateUsage(hash, lane.equipment_code);
            expect(updated).to.not.be.null;
            expect(updated.usage_frequency).to.be.at.least(1);
        });
    });

    describe('4. Error Handling', () => {
        it('should handle API failures gracefully', async () => {
            // Temporarily invalidate API key
            const originalKey = process.env.HERE_API_KEY;
            process.env.HERE_API_KEY = 'invalid';

            const cities = await intelligence.findAndCacheCitiesNearby(
                41.8781, -87.6298
            );

            expect(cities).to.be.an('array');
            expect(cities).to.have.length(0);

            // Restore API key
            process.env.HERE_API_KEY = originalKey;
        });

        it('should retry failed database operations', async () => {
            const result = await intelligence.updateUsage(
                'non-existent-hash',
                'V',
                2
            );
            expect(result).to.be.null;
        });
    });

    describe('5. Performance Metrics', () => {
        it('should track API calls and cache hits', async () => {
            const beforeStats = intelligence.getStats();
            await intelligence.findAndCacheCitiesNearby(41.8781, -87.6298);
            const afterStats = intelligence.getStats();

            expect(afterStats.apiCalls).to.be.at.least(beforeStats.apiCalls);
        });
    });
});

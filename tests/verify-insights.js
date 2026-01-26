// tests/verify-insights.js
import { FreightIntelligence } from '../lib/FreightIntelligence.js';

async function verifyInsights() {
    console.log('Verifying Intelligent Insights...');
    
    try {
        const intelligence = new FreightIntelligence();
        
        // Test real market data retrieval
        const marketData = await intelligence.getHistoricalData({
            origin: {
                city: 'Chicago',
                state: 'IL'
            },
            destination: {
                city: 'Atlanta',
                state: 'GA'
            },
            equipment: 'V'
        });
        
        // Verify market data
        if (!marketData.volume_trends || !marketData.rate_trends) {
            throw new Error('Missing market trend data');
        }
        
        // Test intelligent crawl generation
        const crawlResult = await intelligence.generateDiversePairs({
            origin: {
                city: 'Chicago',
                state: 'IL'
            },
            destination: {
                city: 'Atlanta',
                state: 'GA'
            },
            equipment: 'V',
            preferFillTo10: true
        });
        
        // Verify crawl results
        if (!crawlResult.pairs || crawlResult.pairs.length < 6) {
            throw new Error('Insufficient crawl pairs generated');
        }
        
        // Verify KMA diversity
        const pickupKMAs = new Set(crawlResult.pairs.map(p => p.pickup.kma_code));
        const deliveryKMAs = new Set(crawlResult.pairs.map(p => p.delivery.kma_code));
        
        if (pickupKMAs.size < 3 || deliveryKMAs.size < 3) {
            throw new Error('Insufficient KMA diversity');
        }
        
        console.log('✅ Intelligent Insights verification passed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Intelligent Insights verification failed:', error);
        process.exit(1);
    }
}

verifyInsights();

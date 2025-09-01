// Comprehensive KMA network testing
import { generateUniquePairs } from './lib/definitiveIntelligent.fixed.js';
import { adminSupabase } from './utils/supabaseClient.js';

const nationalTestLanes = [
    // Southeast Network (existing strength)
    {
        name: 'Atlanta Hub Distribution',
        origin: { city: 'Atlanta', state: 'GA' },
        destination: { city: 'Charlotte', state: 'NC' },
        equipment: 'FD',
        expectedKmas: ['GA_ATL', 'NC_CLT'],
        strength: 2
    },
    
    // Northeast Corridor (testing NYC adjacencies)
    {
        name: 'NYC Metro Distribution',
        origin: { city: 'New York', state: 'NY' },
        destination: { city: 'Allentown', state: 'PA' },
        equipment: 'V',
        expectedKmas: ['NY_NYC', 'PA_ABE'],
        strength: 2
    },
    
    // Midwest Network (testing Chicago hub)
    {
        name: 'Chicago Industrial',
        origin: { city: 'Chicago', state: 'IL' },
        destination: { city: 'Detroit', state: 'MI' },
        equipment: 'FD',
        expectedKmas: ['IL_CHI', 'MI_DET'],
        strength: 2
    },
    
    // Florida Network (testing Miami connections)
    {
        name: 'Florida Distribution',
        origin: { city: 'Miami', state: 'FL' },
        destination: { city: 'Orlando', state: 'FL' },
        equipment: 'V',
        expectedKmas: ['FL_MIA', 'FL_ORL'],
        strength: 2
    },
    
    // Cross-Network Test (testing multiple adjacencies)
    {
        name: 'Southeast-Midwest Connection',
        origin: { city: 'Atlanta', state: 'GA' },
        destination: { city: 'Indianapolis', state: 'IN' },
        equipment: 'FD',
        expectedKmas: ['GA_ATL', 'IN_IND'],
        strength: 1 // Should be weaker connection
    }
];

async function testKMANetwork() {
    console.log('🌐 TESTING COMPREHENSIVE KMA NETWORK');
    console.log('='.repeat(60));

    // Track KMA relationship successes
    const kmaConnections = new Map();
    let totalPairs = 0;
    let validKmaCount = 0;

    for (const lane of nationalTestLanes) {
        console.log(`\n📍 Testing: ${lane.name}`);
        console.log(`   ${lane.origin.city}, ${lane.origin.state} → ${lane.destination.city}, ${lane.destination.state}`);
        console.log(`   Equipment: ${lane.equipment}`);
        console.log(`   Expected KMAs: ${lane.expectedKmas.join(' → ')}`);
        console.log(`   Expected Strength: ${lane.strength}`);

        try {
            // Get detailed city data
            const { data: originCity } = await adminSupabase
                .from('cities')
                .select('*')
                .eq('city', lane.origin.city)
                .eq('state_or_province', lane.origin.state)
                .single();

            const { data: destCity } = await adminSupabase
                .from('cities')
                .select('*')
                .eq('city', lane.destination.city)
                .eq('state_or_province', lane.destination.state)
                .single();

            if (!originCity || !destCity) {
                throw new Error('Could not find city data');
            }

            // Check KMA adjacency in database
            const { data: adjacency } = await adminSupabase
                .from('kma_adjacency')
                .select('*')
                .eq('kma_code', originCity.kma_code)
                .eq('adjacent_kma', destCity.kma_code)
                .single();

            // Generate pairs
            const pairs = await generateUniquePairs({
                baseOrigin: originCity,
                baseDest: destCity,
                equipment: lane.equipment,
                minPostings: 6,
                maxRadius: 75
            });

            // Analyze KMA relationships
            console.log('\n📊 Results:');
            console.log(`   Generated ${pairs.length} unique pairs`);

            const kmas = new Set();
            const kmaLinks = new Set();
            
            pairs.forEach(pair => {
                kmas.add(pair.kmas.pickup);
                kmas.add(pair.kmas.delivery);
                kmaLinks.add(`${pair.kmas.pickup}→${pair.kmas.delivery}`);
            });

            // Check if expected KMAs were used
            const foundExpectedKmas = lane.expectedKmas.every(kma => kmas.has(kma));
            if (foundExpectedKmas) validKmaCount++;

            // Record KMA connection strength
            kmaLinks.forEach(link => {
                if (!kmaConnections.has(link)) {
                    kmaConnections.set(link, 1);
                } else {
                    kmaConnections.set(link, kmaConnections.get(link) + 1);
                }
            });

            console.log('\n   KMA Network Analysis:');
            console.log(`   • Unique KMAs used: ${kmas.size}`);
            console.log(`   • KMA connections found: ${kmaLinks.size}`);
            console.log(`   • Database strength: ${adjacency ? adjacency.strength : 'Not found'}`);
            console.log(`   • Expected KMAs ${foundExpectedKmas ? '✅' : '❌'}`);

            // List pairs with KMA relationships
            console.log('\n   Generated pairs with KMA relationships:');
            pairs.forEach((pair, i) => {
                console.log(`   ${i + 1}. ${pair.pickup.city}, ${pair.pickup.state} → ${pair.delivery.city}, ${pair.delivery.state}`);
                console.log(`      KMAs: ${pair.kmas.pickup} → ${pair.kmas.delivery}`);
                console.log(`      Distance: ${Math.round(pair.distances.pickup)}mi/${Math.round(pair.distances.delivery)}mi`);
            });

            totalPairs += pairs.length;

        } catch (error) {
            console.error(`Error testing lane: ${error.message}`);
        }
    }

    // Final KMA network analysis
    console.log('\n📈 KMA NETWORK ANALYSIS');
    console.log('='.repeat(60));
    console.log(`Total pairs generated: ${totalPairs}`);
    console.log(`KMA success rate: ${((validKmaCount / nationalTestLanes.length) * 100).toFixed(1)}%`);
    
    // Analyze KMA connection strengths
    console.log('\nKMA Connection Strength Analysis:');
    const sortedConnections = [...kmaConnections.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    sortedConnections.forEach(([connection, strength]) => {
        console.log(`${connection}: ${strength} occurrences`);
    });
}

// Run comprehensive KMA network test
testKMANetwork().catch(console.error);

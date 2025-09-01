import axios from 'axios';

const HERE_API_KEY = process.env.HERE_API_KEY;

async function testCityDiscovery() {
    // Test with actual TQL route coordinates
    const testLocations = [
        {
            name: "Charlotte Area",
            lat: 35.2271,
            lng: -80.8431,
            radius: 75 // miles
        }
    ];

    for (const location of testLocations) {
        console.log(`\n🌍 Testing ${location.name}`);
        console.log('='.repeat(60));

        // Create a grid of points within the radius to search
        const points = generateSearchGrid(
            location.lat, 
            location.lng, 
            location.radius,
            10 // number of points per direction
        );

        const cities = new Map(); // Use map to deduplicate

        try {
            // Search each point in the grid
            for (const point of points) {
                const response = await axios.get('https://revgeocode.search.hereapi.com/v1/revgeocode', {
                    params: {
                        apiKey: HERE_API_KEY,
                        at: `${point.lat},${point.lng}`,
                        lang: 'en'
                    }
                });

                if (response.data && response.data.items) {
                    response.data.items.forEach(item => {
                        if (item.address && 
                            item.address.city && 
                            item.address.state) {
                            
                            const cityKey = `${item.address.city},${item.address.state}`;
                            if (!cities.has(cityKey)) {
                                const distance = calculateDistance(
                                    location.lat, location.lng,
                                    item.position.lat,
                                    item.position.lng
                                );

                                if (distance <= location.radius) {
                                    cities.set(cityKey, {
                                        name: item.address.city,
                                        state: item.address.state,
                                        county: item.address.county,
                                        position: item.position,
                                        distance
                                    });
                                }
                            }
                        }
                    });
                }
            }

            // Display results
            console.log(`Found ${cities.size} unique cities\n`);
            
            // Sort by distance
            const sortedCities = Array.from(cities.values())
                .sort((a, b) => a.distance - b.distance);

            sortedCities.forEach(city => {
                console.log(`• ${city.name}, ${city.state}`);
                console.log(`  County: ${city.county || 'N/A'}`);
                console.log(`  Distance: ${city.distance.toFixed(1)} miles`);
                console.log(`  Coordinates: ${city.position.lat}, ${city.position.lng}\n`);
            });

            // State analysis
            const stateCount = new Map();
            sortedCities.forEach(city => {
                stateCount.set(city.state, (stateCount.get(city.state) || 0) + 1);
            });

            console.log('\n📊 State Coverage:');
            for (const [state, count] of stateCount.entries()) {
                console.log(`${state}: ${count} cities`);
            }

        } catch (error) {
            console.error(`Error:`, error.response?.data || error.message);
        }
    }
}

// Generate a grid of points within the radius
function generateSearchGrid(centerLat, centerLng, radiusMiles, pointsPerDirection) {
    const points = [];
    const radiusMeters = radiusMiles * 1609.34;
    
    // Convert radius to rough lat/lng delta
    const latDelta = radiusMiles / 69; // roughly miles to degrees
    const lngDelta = radiusMiles / (69 * Math.cos(centerLat * Math.PI / 180));
    
    // Create grid
    for (let i = -pointsPerDirection; i <= pointsPerDirection; i++) {
        for (let j = -pointsPerDirection; j <= pointsPerDirection; j++) {
            const lat = centerLat + (i * latDelta / pointsPerDirection);
            const lng = centerLng + (j * lngDelta / pointsPerDirection);
            
            // Only include points within the radius
            const distance = calculateDistance(centerLat, centerLng, lat, lng);
            if (distance <= radiusMiles) {
                points.push({ lat, lng });
            }
        }
    }
    
    return points;
}

// Helper function to calculate distance in miles
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(degrees) {
    return degrees * Math.PI / 180;
}

// Run the improved city discovery test
testCityDiscovery().catch(console.error);

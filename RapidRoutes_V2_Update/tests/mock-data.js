/**
 * Centralized test data for RapidRoutes testing
 */

export const MOCK_CITIES = [
    // Cincinnati hub
    {
        city: 'Cincinnati',
        state_or_province: 'OH',
        zip: '45202',
        latitude: 39.1031,
        longitude: -84.5120,
        kma_code: 'CVG',
        kma_name: 'Cincinnati',
        industrial_score: 0.85,
        population: 303940,
        country: 'USA',
        city_state: 'Cincinnati, OH',
        update_count: 0,
        market_score: 0.85
    },
    // Cincinnati surrounding cities (within 75 miles)
    {
        city: 'Covington',
        state_or_province: 'KY',
        zip: '41011',
        latitude: 39.0837,
        longitude: -84.5086,
        kma_code: 'CVG',
        kma_name: 'Cincinnati',
        industrial_score: 0.75,
        population: 40578,
        country: 'USA',
        city_state: 'Covington, KY',
        update_count: 0,
        market_score: 0.75
    },
    {
        city: 'Newport',
        state_or_province: 'KY',
        zip: '41071',
        latitude: 39.0915,
        longitude: -84.4916,
        kma_code: 'CVG',
        kma_name: 'Cincinnati',
        industrial_score: 0.70,
        population: 15273,
        country: 'USA',
        city_state: 'Newport, KY',
        update_count: 0,
        market_score: 0.70
    },
    {
        city: 'Hamilton',
        state_or_province: 'OH',
        zip: '45011',
        latitude: 39.3995,
        longitude: -84.5613,
        kma_code: 'CVG',
        kma_name: 'Cincinnati',
        industrial_score: 0.65,
        population: 62092,
        country: 'USA',
        city_state: 'Hamilton, OH',
        update_count: 0,
        market_score: 0.65
    },
    {
        city: 'Fairfield',
        state_or_province: 'OH',
        zip: '45014',
        latitude: 39.3454,
        longitude: -84.5603,
        kma_code: 'CVG',
        kma_name: 'Cincinnati',
        industrial_score: 0.60,
        population: 42762,
        country: 'USA',
        city_state: 'Fairfield, OH',
        update_count: 0,
        market_score: 0.60
    },
    // Chicago hub
    {
        city: 'Chicago',
        state_or_province: 'IL',
        zip: '60601',
        latitude: 41.8781,
        longitude: -87.6298,
        kma_code: 'CHI',
        kma_name: 'Chicago',
        industrial_score: 0.90,
        population: 2746388,
        country: 'USA',
        city_state: 'Chicago, IL',
        update_count: 0,
        market_score: 0.90
    },
    // Chicago surrounding cities (within 75 miles)
    {
        city: 'Hammond',
        state_or_province: 'IN',
        zip: '46320',
        latitude: 41.5833,
        longitude: -87.5000,
        kma_code: 'CHI',
        kma_name: 'Chicago',
        industrial_score: 0.75,
        population: 75795,
        country: 'USA',
        city_state: 'Hammond, IN',
        update_count: 0,
        market_score: 0.75
    },
    {
        city: 'Gary',
        state_or_province: 'IN',
        zip: '46402',
        latitude: 41.5933,
        longitude: -87.3464,
        kma_code: 'CHI',
        kma_name: 'Chicago',
        industrial_score: 0.70,
        population: 69093,
        country: 'USA',
        city_state: 'Gary, IN',
        update_count: 0,
        market_score: 0.70
    },
    {
        city: 'Cicero',
        state_or_province: 'IL',
        zip: '60804',
        latitude: 41.8445,
        longitude: -87.7539,
        kma_code: 'CHI',
        kma_name: 'Chicago',
        industrial_score: 0.65,
        population: 81597,
        country: 'USA',
        city_state: 'Cicero, IL',
        update_count: 0,
        market_score: 0.65
    },
    // More Chicago area cities for testing
    {
        city: 'Evanston',
        state_or_province: 'IL',
        zip: '60201',
        latitude: 42.0451,
        longitude: -87.6877,
        kma_code: 'CHI',
        kma_name: 'Chicago',
        industrial_score: 0.60,
        population: 78110,
        country: 'USA',
        city_state: 'Evanston, IL',
        update_count: 0,
        market_score: 0.60
    },
    {
        city: 'Oak Park',
        state_or_province: 'IL',
        zip: '60302',
        latitude: 41.8850,
        longitude: -87.7845,
        kma_code: 'CHI',
        kma_name: 'Chicago',
        industrial_score: 0.55,
        population: 54583,
        country: 'USA',
        city_state: 'Oak Park, IL',
        update_count: 0,
        market_score: 0.55
    },
    {
        city: 'Skokie',
        state_or_province: 'IL',
        zip: '60077',
        latitude: 42.0324,
        longitude: -87.7416,
        kma_code: 'CHI',
        kma_name: 'Chicago',
        industrial_score: 0.50,
        population: 67824,
        country: 'USA',
        city_state: 'Skokie, IL',
        update_count: 0,
        market_score: 0.50
    }
];

export const MOCK_LANES = [
    {
        id: '00000000-0000-0000-0000-000000000001',
        origin_city: 'Cincinnati',
        origin_state: 'OH',
        origin_zip: '45202',
        dest_city: 'Chicago',
        dest_state: 'IL',
        dest_zip: '60601',
        equipment_code: 'V',
        length_ft: 53,
        weight_lbs: 42000,
        weight_min: 40000,
        weight_max: 44000,
        pickup_earliest: new Date('2024-03-01'),
        pickup_latest: new Date('2024-03-02'),
        commodity: 'General Freight',
        reference_id: 'TEST_LANE_001',
        status: 'active',
        comment: 'Test load for unit tests',
        full_partial: 'Full',
        randomize_weight: false,
        created_at: new Date('2024-02-29')
    },
    {
        id: '00000000-0000-0000-0000-000000000002',
        origin_city: 'Chicago',
        origin_state: 'IL',
        origin_zip: '60601',
        dest_city: 'Cincinnati',
        dest_state: 'OH',
        dest_zip: '45202',
        equipment_code: 'FD',
        length_ft: 48,
        weight_lbs: 45000,
        weight_min: 42000,
        weight_max: 48000,
        pickup_earliest: new Date('2024-03-02'),
        pickup_latest: new Date('2024-03-03'),
        commodity: 'Steel Coils',
        reference_id: 'TEST_LANE_002',
        status: 'active',
        comment: 'Heavy haul test lane',
        full_partial: 'Full',
        randomize_weight: true,
        created_at: new Date('2024-02-29')
    }
];

export const setupTestData = async () => {
    // Set up mock data here
    return true;
};

export const cleanupTestData = async () => {
    // Clean up mock data here
    return true;
};

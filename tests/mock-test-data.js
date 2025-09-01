/**
 * Test data with coordinates for lane generation
 */

export const TEST_CITIES = [
  {
    city: 'Cincinnati',
    state_or_province: 'OH',
    latitude: 39.1031,
    longitude: -84.5120,
    kma: 'CVG',
    kma_name: 'Cincinnati',
    industrial_score: 0.85
  },
  {
    city: 'Chicago',
    state_or_province: 'IL',
    latitude: 41.8781,
    longitude: -87.6298,
    kma: 'CHI',
    kma_name: 'Chicago',
    industrial_score: 0.90
  },
  // Cincinnati area
  {
    city: 'Covington',
    state_or_province: 'KY',
    latitude: 39.0837,
    longitude: -84.5086,
    kma: 'CVG',
    kma_name: 'Cincinnati',
    industrial_score: 0.75
  },
  {
    city: 'Newport',
    state_or_province: 'KY',
    latitude: 39.0915,
    longitude: -84.4960,
    kma: 'CVG',
    kma_name: 'Cincinnati',
    industrial_score: 0.70
  },
  {
    city: 'Norwood',
    state_or_province: 'OH',
    latitude: 39.1617,
    longitude: -84.4538,
    kma: 'CVG',
    kma_name: 'Cincinnati',
    industrial_score: 0.80
  },
  // Chicago area
  {
    city: 'Oak Park',
    state_or_province: 'IL',
    latitude: 41.8850,
    longitude: -87.7845,
    kma: 'CHI',
    kma_name: 'Chicago',
    industrial_score: 0.75
  },
  {
    city: 'Evanston',
    state_or_province: 'IL',
    latitude: 42.0451,
    longitude: -87.6877,
    kma: 'CHI',
    kma_name: 'Chicago',
    industrial_score: 0.70
  },
  {
    city: 'Hammond',
    state_or_province: 'IN',
    latitude: 41.5833,
    longitude: -87.5000,
    kma: 'CHI',
    kma_name: 'Chicago',
    industrial_score: 0.85
  }
];

export const EQUIPMENT_TYPES = {
  'V': { code: 'V', name: 'Van', maxWeight: 45000 },
  'FD': { code: 'FD', name: 'Flatbed', maxWeight: 48000 },
  'R': { code: 'R', name: 'Reefer', maxWeight: 44000 }
};

export const TEST_LANES = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    origin_city: 'Cincinnati',
    origin_state_or_province: 'OH',
    origin_zip: '45202',
    origin_latitude: 39.1031,
    origin_longitude: -84.5120,
    dest_city: 'Chicago', 
    dest_state_or_province: 'IL',
    dest_zip: '60601',
    dest_latitude: 41.8781,
    dest_longitude: -87.6298,
    equipment_code: 'V',
    weight_lbs: 40000,
    randomize_weight: false,
    length_ft: 53,
    full_partial: 'full',
    pickup_earliest: '2025-09-01',
    pickup_latest: '2025-09-02'
  }
];

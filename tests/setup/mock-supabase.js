import { vi } from 'vitest';

// Mock Supabase client with complete responses
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockResolvedValue({
      data: [
        {
          city: "Oak Park",
          state: "IL", 
          distance: 15,
          kma: "CHI",
          latitude: 41.8850,
          longitude: -87.7845
        },
        {
          city: "Evanston",
          state: "IL",
          distance: 20,
          kma: "CHI",
          latitude: 42.0451,
          longitude: -87.6877
        },
        {
          city: "Hammond",
          state: "IN",
          distance: 25,
          kma: "CHI",
          latitude: 41.5833,
          longitude: -87.5000
        },
        {
          city: "Cicero",
          state: "IL",
          distance: 30,
          kma: "CHI",
          latitude: 41.8456,
          longitude: -87.7539
        }
      ],
      error: null
    }),
    upsert: vi.fn().mockResolvedValue({ error: null, data: [] }),
    delete: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ error: null, data: [] })
  }))
};

vi.mock('../../utils/supabaseClient.js', () => ({
  adminSupabase: mockSupabase
}));

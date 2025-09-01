// tests/setup.js
// Test environment setup for RapidRoutes

import { vi } from 'vitest';
import './setup/mock-here-api.js';

// Set up environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://gwuhjxomavulwduhvgvi.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Mzk2MjksImV4cCI6MjA2NzUxNTYyOX0.fM8EeVag9MREyjBVv2asGpIgI_S7k_889kDDbE-8oUs';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ';

// Disable debug mode for tests
process.env.NODE_ENV = 'test';

// Mock fetch for tests that don't need real HTTP calls
global.fetch = vi.fn();

// Suppress console output in tests unless needed
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: console.error, // Keep error logging for test debugging
};

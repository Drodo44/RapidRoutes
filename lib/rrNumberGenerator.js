// lib/rrNumberGenerator.js
// Global RR number generator for RapidRoutes
// Format: RR##### (5 digits, never multiple zeros consecutively)
// Numbers increment sequentially, never reset daily
// Counter stored in Supabase table `rr_sequence` (single row)
// Exported as getNextRRNumber()

import { adminSupabase } from '../utils/supabaseAdminClient.js';

const SEQUENCE_TABLE = 'rr_sequence';
const SEQUENCE_ID = 1; // single row with id=1

// Helper to check for consecutive zeros
function hasConsecutiveZeros(numStr) {
  return /00+/.test(numStr);
}

// Pads and formats the RR number
function formatRRNumber(num) {
  let numStr = num.toString();
  // Ensure 5 digits
  numStr = numStr.padStart(5, '0');
  // If consecutive zeros, increment until valid
  while (hasConsecutiveZeros(numStr)) {
    num++;
    numStr = num.toString().padStart(5, '0');
  }
  return `RR${numStr}`;
}

// Gets and increments the global RR number
export async function getNextRRNumber() {
  // Fetch current sequence
  const { data, error } = await adminSupabase
    .from(SEQUENCE_TABLE)
    .select('counter')
    .eq('id', SEQUENCE_ID)
    .maybeSingle();

  if (error && !String(error.message || '').toLowerCase().includes('no rows')) {
    // If table missing or other hard errors, bubble up and let API fallback
    throw new Error('Failed to fetch RR sequence: ' + error.message);
  }

  let current = data?.counter ?? 12340; // Start at RR12340 if not set
  let next = current + 1;

  // Format and validate
  let rrNumber = formatRRNumber(next);

  // Persist new counter
  // Upsert row (handles first-time initialization)
  const { error: updateError } = await adminSupabase
    .from(SEQUENCE_TABLE)
    .upsert({ id: SEQUENCE_ID, counter: next }, { onConflict: 'id' });

  if (updateError) throw new Error('Failed to update RR sequence: ' + updateError.message);

  return rrNumber;
}

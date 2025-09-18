// lib/rrNumberGenerator.js
// Global RR number generator for RapidRoutes
// Format: RR##### (5 digits, never multiple zeros consecutively)
// Numbers increment sequentially, never reset daily
// Counter stored in Supabase table `rr_sequence` (single row)
// Exported as getNextRRNumber()

import { adminSupabase } from '../utils/supabaseClient';

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
    .single();

  if (error) throw new Error('Failed to fetch RR sequence: ' + error.message);

  let current = data?.counter ?? 12340; // Start at RR12340 if not set
  let next = current + 1;

  // Format and validate
  let rrNumber = formatRRNumber(next);

  // Persist new counter
  const { error: updateError } = await adminSupabase
    .from(SEQUENCE_TABLE)
    .update({ counter: next })
    .eq('id', SEQUENCE_ID);

  if (updateError) throw new Error('Failed to update RR sequence: ' + updateError.message);

  return rrNumber;
}

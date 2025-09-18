// pages/api/rr-number.js
// API endpoint for RR number generation

import { adminSupabase } from '../../utils/supabaseClient.js';

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

// Generate a simple fallback RR number if database fails
function generateFallbackRRNumber() {
  const timestamp = Date.now().toString().slice(-5);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `RR${timestamp.slice(0, 3)}${random}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to fetch current sequence
    const { data, error } = await adminSupabase
      .from('rr_sequence')
      .select('counter')
      .eq('id', 1)
      .single();

    let current = 12340; // Default starting point
    
    if (error) {
      console.log('RR sequence table not found, using fallback...');
      // If table doesn't exist or other error, use fallback
      const fallbackRR = generateFallbackRRNumber();
      return res.status(200).json({
        success: true,
        rrNumber: fallbackRR
      });
    }

    current = data?.counter ?? 12340;
    let next = current + 1;

    // Format and validate
    let rrNumber = formatRRNumber(next);

    // Try to update sequence
    const { error: updateError } = await adminSupabase
      .from('rr_sequence')
      .update({ counter: next })
      .eq('id', 1);

    if (updateError) {
      console.log('Failed to update RR sequence, using current number...');
      // Still return the RR number even if update fails
    }

    res.status(200).json({
      success: true,
      rrNumber: rrNumber
    });

  } catch (error) {
    console.error('❌ RR Number API error:', error);
    // Fallback to timestamp-based RR number
    const fallbackRR = generateFallbackRRNumber();
    res.status(200).json({
      success: true,
      rrNumber: fallbackRR
    });
  }
}
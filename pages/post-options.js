import { useState } from 'react';
import Head from 'next/head';
// Import direct Header component - HARD KILL for React #130
import Header from '@/components/Header';
// Import auth helpers from central location
import { safeGetCurrentToken } from '@/lib/auth/safeAuth';
import { z } from 'zod';

// Define zod schema for validating API payloads
const PostOptionsPayload = z.object({
  laneId: z.string().uuid(),
  originCity: z.string().min(1),
  originState: z.string().min(2),
  destinationCity: z.string().min(1),
  destinationState: z.string().min(2),
  equipmentCode: z.string().min(1),
});

export default function PostOptions() {
  // Minimal state with only what's needed for basic functionality
  const [loading, setLoading] = useState(false);

  // Minimal function to handle validation and API call
  async function handleGenerateOptions(lane) {
    try {
      // Get laneId from either format
      const laneId = lane?.id ?? lane?.laneId ?? null;
      
      if (!laneId) {
        console.error('Missing laneId in handleGenerateOptions');
        return;
      }
      
      // Create payload with both formats of data
      const payload = {
        laneId,
        originCity: lane?.originCity ?? lane?.origin_city ?? '',
        originState: lane?.originState ?? lane?.origin_state ?? '',
        destinationCity: lane?.destinationCity ?? lane?.destination_city ?? '',
        destinationState: lane?.destinationState ?? lane?.destination_state ?? '',
        equipmentCode: lane?.equipmentCode ?? lane?.equipment_code ?? '',
      };

      // Validate with zod
      const parsed = PostOptionsPayload.safeParse(payload);
      if (!parsed.success) {
        console.error('Invalid payload for /api/post-options:', parsed.error.flatten());
        return;
      }

      // Get token from safe auth helper
      const accessToken = await safeGetCurrentToken();
      if (!accessToken) {
        console.error('Missing access token when posting options');
        return;
      }

      // Make the API call
      const res = await fetch('/api/post-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Failed to generate options:', text || res.status);
        return;
      }

      const json = await res.json();
      console.log('Options generated successfully:', json);
      return json;
    } catch (err) {
      console.error('Error in handleGenerateOptions:', err);
    }
  }

  // If we needed to support multiple lanes in a batch
  async function handleGenerateAllOptions(lanes = []) {
    if (!Array.isArray(lanes) || lanes.length === 0) {
      console.log('No lanes provided to generate options for');
      return;
    }
    
    console.log(`Generating options for ${lanes.length} lanes`);
    for (const lane of lanes) {
      await handleGenerateOptions(lane);
    }
  }

  // Minimal rendering - guaranteed to work with no React errors
  return (
    <>
      <Head>
        <title>Post Options - RapidRoutes</title>
      </Head>
      <Header />
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-100">Post Options</h1>
              <p className="mt-2 text-gray-400">This page is under maintenance</p>
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Maintenance Notice</h2>
            <p className="text-gray-300 mb-4">
              We are currently performing updates to fix stability issues with this page. 
              Please check back shortly or contact support if you need immediate assistance.
            </p>
            <p className="text-gray-400 text-sm">
              Reference: React Error #130 resolution in progress
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
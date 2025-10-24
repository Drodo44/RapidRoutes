// pages/api/laneRecords.js
// Server-only endpoint to fetch lane records using admin Supabase client
// Prevents client bundles from importing server-only services

import { withErrorHandler } from '@/lib/apiErrorHandler';
import { sanitizeLaneFilters, fetchLaneRecords } from '../../services/laneService.js';

async function handler(req, res) {
  // Enforce GET only
  if (req.method !== 'GET') return res.status(405).end();

  const {
    status,
    limit,
    onlyWithSavedCities,
    includeArchived,
    originKmaCodes,
    destinationKmaCodes,
    originZip3,
    destinationZip3,
    createdAfter,
    createdBefore,
    searchTerm,
  } = req.query || {};

  // Normalize booleans and arrays from query string
  const toBool = (v) => v === '1' || v === 'true' || v === true;
  const toArr = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : Array.isArray(v) ? v : []);

  const filters = sanitizeLaneFilters({
    status,
    limit: limit ? Number(limit) : undefined,
    onlyWithSavedCities: toBool(onlyWithSavedCities),
    includeArchived: toBool(includeArchived),
    originKmaCodes: toArr(originKmaCodes),
    destinationKmaCodes: toArr(destinationKmaCodes),
    originZip3,
    destinationZip3,
    createdAfter,
    createdBefore,
    searchTerm,
  });

  const data = await fetchLaneRecords(filters);
  return res.status(200).json({ ok: true, data });
}

export default withErrorHandler(handler);

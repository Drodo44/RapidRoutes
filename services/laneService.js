// services/laneService.js - Production-ready JavaScript version
// SERVER-ONLY: Do not import the admin client at module load to avoid bundling it in the client.
// Lazily import inside functions so accidental client imports don't execute server code.

async function getSupabaseAdmin() {
  const mod = await import("@/lib/supabaseAdmin");
  return mod.default;
}

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 2000;

// Simplified filter sanitization for TypeScript compatibility
export function sanitizeLaneFilters(filters = {}) {
  const limit = filters.limit || DEFAULT_LIMIT;
  const sanitizedLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(Number(limit), MAX_LIMIT))
    : DEFAULT_LIMIT;

  return {
    status: filters.status || "current",
    limit: sanitizedLimit,
    searchTerm: typeof filters.searchTerm === "string" ? filters.searchTerm.trim() : undefined,
    onlyWithSavedCities: filters.onlyWithSavedCities || false,
    includeArchived: filters.includeArchived || false,
    originKmaCodes: filters.originKmaCodes || [],
    destinationKmaCodes: filters.destinationKmaCodes || [],
    originZip3: filters.originZip3,
    destinationZip3: filters.destinationZip3,
    createdAfter: filters.createdAfter,
    createdBefore: filters.createdBefore,
  };
}

// Note: We obtain the admin client within each async function via getSupabaseAdmin()

/**
 * NOTE: This function queries dat_loads_2025 ONLY for analytics/volume data.
 * All KMA enrichment and city lookups now use the canonical 'cities' table.
 * See: enrichLaneWithCitiesData() for location enrichment logic.
 */
export async function fetchLaneRecords(filters = {}) {
  const limit = filters.limit || DEFAULT_LIMIT;

  try {
    const supabase = await getSupabaseAdmin();
    const { data: laneData, error: laneError } = await supabase
      .from("dat_loads_2025")
      .select("*")
      .limit(limit);

    if (laneError || !laneData) {
      return [];
    }

    // Map the data (NOTE: KMA data here is for display only, not for enrichment)
    const mapped = laneData.map((lane) => ({
      id: String(lane["Shipment/Load ID"] || ""),
      lane_id: String(lane["Shipment/Load ID"] || ""),
      reference_id: String(lane["Shipment/Load ID"] || ""),
      origin_city: lane["Origin City"] || "",
      origin_state: lane["Origin State"] || "",
      origin_zip: String(lane["Origin Zip Code"] || ""),
      origin_zip3: lane["origin_zip3"] || null,
      origin_kma_code: lane["origin_kma"] || null,
      origin_kma_name: lane["origin_kma"] || null, // origin_kma contains the market name like "Seattle Mkt"
      destination_city: lane["Destination City"] || "",
      destination_state: lane["Destination State"] || "",
      destination_zip: String(lane["Destination Zip Code"] || ""),
      destination_zip3: lane["destination_zip3"] || null,
      destination_kma_code: lane["destination_kma"] || null,
      destination_kma_name: lane["destination_kma"] || null, // destination_kma contains the market name like "Los Angeles Mkt"
      equipment_code: lane["Equipment"] || null,
      equipment_label: lane["Equipment Details"] || null,
      pickup_earliest: lane["Pickup Date"] || null,
      pickup_latest: lane["Pickup Latest"] || null,
      pickup_date: lane["Pickup Date"] || null,
      commodity: lane["Commodity"] || null,
      comment: lane["Comment"] || null,
      miles: lane["DAT Used Miles"] || lane["Customer Mileage"] || null,
      length_ft: lane["Length (ft)"] || null,
      weight_lbs: lane["Weight (lbs)"] || null,
      full_partial: lane["Full/Partial"] || null,
    }));

    return mapped;
  } catch (err) {
    console.error("[laneService] Query failed:", err.message);
    return [];
  }
}

/**
 * Fetch lanes by specific IDs or query filters (for CSV export)
 * NOTE: This queries dat_loads_2025 for volume analytics only.
 * Use enrichLaneWithCitiesData() for KMA/location enrichment.
 */
export async function getLanesByIdsOrQuery({ ids = [], limit = DEFAULT_LIMIT } = {}) {
  try {
    const supabase = await getSupabaseAdmin();
    let query = supabase.from("dat_loads_2025").select("*");

    // If IDs provided, filter by them
    if (ids && ids.length > 0) {
      query = query.in("Shipment/Load ID", ids);
    }

    query = query.limit(limit);

    const { data: laneData, error: laneError } = await query;

    if (laneError || !laneData) {
      console.error("[getLanesByIdsOrQuery] Error:", laneError);
      return [];
    }

    // Map the data (same mapping as fetchLaneRecords)
    const mapped = laneData.map((lane) => ({
      id: String(lane["Shipment/Load ID"] || ""),
      lane_id: String(lane["Shipment/Load ID"] || ""),
      reference_id: String(lane["Shipment/Load ID"] || ""),
      origin_city: lane["Origin City"] || "",
      origin_state: lane["Origin State"] || "",
      origin_zip: String(lane["Origin Zip Code"] || ""),
      origin_zip3: lane["origin_zip3"] || null,
      origin_kma_code: lane["origin_kma"] || null,
      origin_kma_name: lane["origin_kma"] || null,
      destination_city: lane["Destination City"] || "",
      destination_state: lane["Destination State"] || "",
      destination_zip: String(lane["Destination Zip Code"] || ""),
      destination_zip3: lane["destination_zip3"] || null,
      destination_kma_code: lane["destination_kma"] || null,
      destination_kma_name: lane["destination_kma"] || null,
      equipment_code: lane["Equipment"] || null,
      equipment_label: lane["Equipment Details"] || null,
      pickup_earliest: lane["Pickup Date"] || null,
      pickup_latest: lane["Pickup Latest"] || null,
      pickup_date: lane["Pickup Date"] || null,
      commodity: lane["Commodity"] || null,
      comment: lane["Comment"] || null,
      miles: lane["DAT Used Miles"] || lane["Customer Mileage"] || null,
      length_ft: lane["Length (ft)"] || null,
      weight_lbs: lane["Weight (lbs)"] || null,
      full_partial: lane["Full/Partial"] || null,
    }));

    return mapped;
  } catch (err) {
    console.error("[getLanesByIdsOrQuery] Query failed:", err.message);
    return [];
  }
}

export async function fetchLaneById(laneId) {
  // Stub for now - not critical for initial deployment
  return null;
}

// Additional exports for TypeScript compatibility
export function normalizeKmaCodes(codes) {
  if (!Array.isArray(codes) || codes.length === 0) return undefined;
  return codes;
}

export function normalizeZip3(values) {
  if (!Array.isArray(values) || values.length === 0) return undefined;
  return values;
}

export function mapLaneRowToRecord(row) {
  return row; // Simple passthrough for now
}

export function hasSavedCities(lane) {
  return false; // Stub
}

export async function countLaneRecords(filters = {}) {
  // Stub - return 0 for now
  return 0;
}

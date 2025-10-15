export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type LaneStatus =
  | "current"
  | "archive"
  | "archived"
  | "active"
  | "inactive"
  | "draft"
  | string;

export interface SavedCity {
  city: string;
  state: string;
  kma_code?: string | null;
  kma_name?: string | null;
  lat?: number | null;
  lon?: number | null;
  miles?: number | null;
  zip?: string | null;
  zip3?: string | null;
}

export interface RapidRoutesLaneViewRow {
  id: string;
  lane_id: string | null;
  reference_id: string | null;
  lane_status: LaneStatus | null;
  status: LaneStatus | null;
  origin_city: string | null;
  origin_state: string | null;
  origin_zip: string | null;
  origin_zip3: string | null;
  origin_kma_code: string | null;
  origin_kma_name: string | null;
  destination_city: string | null;
  destination_state: string | null;
  destination_zip: string | null;
  destination_zip3: string | null;
  destination_kma_code: string | null;
  destination_kma_name: string | null;
  equipment_code: string | null;
  equipment_label: string | null;
  length_ft: number | null;
  weight_lbs: number | null;
  randomize_weight: boolean | null;
  weight_min: number | null;
  weight_max: number | null;
  full_partial: string | null;
  pickup_earliest: string | null;
  pickup_latest: string | null;
  commodity: string | null;
  comment: string | null;
  miles: number | null;
  created_at: string | null;
  updated_at: string | null;
  saved_origin_cities: SavedCity[] | null;
  saved_dest_cities: SavedCity[] | null;
  has_saved_choices: boolean | null;
  posted_pairs: Json | null;
  priority_score: number | null;
  user_id: string | null;
  origin_latitude: number | null;
  origin_longitude: number | null;
  dest_latitude: number | null;
  dest_longitude: number | null;
}

export interface LaneRecord extends RapidRoutesLaneViewRow {
  id: string;
  laneId: string;
  originCity: string;
  originState: string;
  originZip3: string | null;
  destinationCity: string;
  destinationState: string;
  destinationZip3: string | null;
  dest_city: string;
  dest_state: string;
  formattedWeight: string | null;
  displayMiles: number | null;
  shortId: string;
  hasSavedChoices: boolean;
  saved_origin_cities: SavedCity[];
  saved_dest_cities: SavedCity[];
}

export interface LaneFilters {
  status?: LaneStatus | "all";
  originKmaCodes?: string[];
  destinationKmaCodes?: string[];
  originZip3?: string[];
  destinationZip3?: string[];
  searchTerm?: string;
  limit?: number;
  onlyWithSavedCities?: boolean;
  includeArchived?: boolean;
  createdAfter?: string | Date;
  createdBefore?: string | Date;
}

export interface IntelligentCityRow {
  city: string;
  state_or_province: string;
  latitude: number;
  longitude: number;
  kma_code: string | null;
  kma_name: string | null;
}

export interface Database {
  public: {
    Tables: {
      rapidroutes_lane_view: {
        Row: RapidRoutesLaneViewRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      intelligent_cities: {
        Row: IntelligentCityRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

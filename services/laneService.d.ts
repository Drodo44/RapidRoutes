// Type definitions for laneService.js
import type { LaneFilters, LaneRecord } from "../types/database";

export function sanitizeLaneFilters(filters?: LaneFilters): Required<LaneFilters>;
export function fetchLaneRecords(filters?: LaneFilters): Promise<LaneRecord[]>;
export function fetchLaneById(laneId: string | number): Promise<LaneRecord | null>;
export function normalizeKmaCodes(codes?: string[]): string[] | undefined;
export function normalizeZip3(values?: string[]): string[] | undefined;
export function mapLaneRowToRecord(row: any): LaneRecord;
export function hasSavedCities(lane: LaneRecord): boolean;
export function countLaneRecords(filters?: LaneFilters): Promise<number>;

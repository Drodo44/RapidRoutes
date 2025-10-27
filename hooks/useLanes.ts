import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LaneFilters, LaneRecord } from "../types/database";
// Use the browser-safe service to avoid importing server-only admin client in the client bundle
import { fetchLaneRecords, sanitizeLaneFilters } from "../services/browserLaneService.js";

export interface UseLanesOptions extends LaneFilters {
  autoFetch?: boolean;
}

interface UseLanesState {
  lanes: LaneRecord[];
  loading: boolean;
  error: Error | null;
}

export type LaneFilterUpdater =
  | LaneFilters
  | ((previous: Required<LaneFilters>) => LaneFilters);

const DEFAULT_FILTERS: LaneFilters = {
  status: "current",
  limit: 200,
  includeArchived: false,
  onlyWithSavedCities: false
};

function isFunctionUpdater(
  value: LaneFilterUpdater
): value is (previous: Required<LaneFilters>) => LaneFilters {
  return typeof value === "function";
}

export function useLanes(options: UseLanesOptions = {}) {
  const initialFilters = useMemo(
    () => sanitizeLaneFilters({ ...DEFAULT_FILTERS, ...options }),
    [options]
  );

  const [filters, setFiltersState] = useState(initialFilters);
  const [state, setState] = useState<UseLanesState>(() => ({
    lanes: [],
    loading: options.autoFetch !== false,
    error: null
  }));

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const filtersRef = useRef(initialFilters);
  const autoFetchRef = useRef(options.autoFetch !== false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    autoFetchRef.current = options.autoFetch !== false;
  }, [options.autoFetch]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // Clean up any pending debounce timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const fetchData = useCallback(
    async (inputFilters?: Required<LaneFilters>) => {
      const activeFilters = inputFilters ?? filtersRef.current;
      const requestId = Date.now();
      requestIdRef.current = requestId;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const lanes = await fetchLaneRecords(activeFilters);

        if (!mountedRef.current || requestIdRef.current !== requestId) {
          return lanes;
        }

        setState({ lanes, loading: false, error: null });
        return lanes;
      } catch (unknownError) {
        const error = unknownError instanceof Error ? unknownError : new Error("Failed to load lanes");

        if (!mountedRef.current || requestIdRef.current !== requestId) {
          return [];
        }

        setState({ lanes: [], loading: false, error });
        return [];
      }
    },
    []
  );

  const setFiltersOnly = useCallback(
    (updater: LaneFilterUpdater) => {
      const next = sanitizeLaneFilters(
        isFunctionUpdater(updater) ? updater(filtersRef.current) : updater
      );
      filtersRef.current = next;
      setFiltersState(next);
      return next;
    },
    []
  );

  const applyFilters = useCallback(
    async (updater: LaneFilterUpdater) => {
      const next = setFiltersOnly(updater);
      if (autoFetchRef.current) {
        return fetchData(next);
      }
      return next;
    },
    [fetchData, setFiltersOnly]
  );

  const refresh = useCallback(() => fetchData(filtersRef.current), [fetchData]);

  useEffect(() => {
    if (filtersRef.current === initialFilters) {
      return;
    }
    filtersRef.current = initialFilters;
    setFiltersState(initialFilters);
  }, [initialFilters]);

  // Only fetch when filters actually change, not on every render
  // Deploy trigger: 2025-10-27 18:18
  const prevFiltersRef = useRef<string>('');
  
  useEffect(() => {
    const currentFiltersStr = JSON.stringify(filters);
    
    // Prevent infinite loop by checking if filters actually changed
    if (prevFiltersRef.current === currentFiltersStr) {
      return;
    }
    
    prevFiltersRef.current = currentFiltersStr;
    filtersRef.current = filters;
    
    if (autoFetchRef.current) {
      // Clear any pending fetch
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Debounce fetch by 100ms to prevent rapid successive calls
      debounceTimerRef.current = setTimeout(() => {
        fetchData(filters);
      }, 100);
    }
    
    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fetchData, filters]);

  return {
    lanes: state.lanes,
    loading: state.loading,
    error: state.error,
    refresh,
    filters,
    setFilters: setFiltersOnly,
    applyFilters,
    latestRequestId: requestIdRef.current
  };
}

export default useLanes;

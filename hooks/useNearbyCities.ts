import { useEffect, useMemo, useRef, useState } from "react";
import type { LaneRecord } from "../types/database";
import type { GroupedCities, NearbyCity } from "../utils/groupCitiesByKMA";
import { fetchCities, type Coordinate } from "../utils/fetchCities";

interface SideState extends GroupedCities {
  loading: boolean;
  error: Error | null;
}

interface NearbyCitiesState {
  origin: SideState;
  destination: SideState;
  coords: {
    originCoord: Coordinate | null;
    destinationCoord: Coordinate | null;
  };
}

export type LaneLike = Partial<LaneRecord> & Record<string, unknown>;

function createEmptySideState(overrides: Partial<SideState> = {}): SideState {
  return {
    groups: {},
    flat: [],
    loading: false,
    error: null,
    ...overrides
  };
}

function normalizeCityList(list: NearbyCity[] | undefined): NearbyCity[] {
  return Array.isArray(list) ? list : [];
}

function deriveLaneIdentity(lane: LaneLike | null | undefined): string {
  if (!lane) {
    return "";
  }

  const parts = [
    (lane.id as string) ?? (lane.lane_id as string) ?? "",
    (lane.origin_city as string) ?? (lane as any).originCity ?? "",
    (lane.origin_state as string) ?? (lane as any).originState ?? "",
    (lane.destination_city as string) ?? (lane as any).dest_city ?? (lane as any).destinationCity ?? "",
    (lane.destination_state as string) ?? (lane as any).dest_state ?? (lane as any).destinationState ?? ""
  ];

  return parts.join("|");
}

export function useNearbyCities(lane: LaneLike | null | undefined): NearbyCitiesState {
  const [originState, setOriginState] = useState<SideState>(() => createEmptySideState());
  const [destinationState, setDestinationState] = useState<SideState>(() => createEmptySideState());
  const [coords, setCoords] = useState<{ originCoord: Coordinate | null; destinationCoord: Coordinate | null }>(
    () => ({ originCoord: null, destinationCoord: null })
  );

  const requestRef = useRef<number>(0);

  const originCity = (lane?.origin_city as string) ?? (lane as any)?.originCity ?? "";
  const originStateVal = (lane?.origin_state as string) ?? (lane as any)?.originState ?? "";
  const destCity = (lane?.destination_city as string) ?? (lane as any)?.dest_city ?? (lane as any)?.destinationCity ?? "";
  const destStateVal = (lane?.destination_state as string) ?? (lane as any)?.dest_state ?? (lane as any)?.destinationState ?? "";

  const hasLane = Boolean(lane && originCity && originStateVal && destCity && destStateVal);

  const laneKey = useMemo(() => {
    if (!hasLane) return null;
    return `${originCity}|${originStateVal}|${destCity}|${destStateVal}`;
  }, [destCity, destStateVal, hasLane, originCity, originStateVal]);

  const laneInput = useMemo(() => {
    if (!laneKey) {
      return null;
    }
    return {
      origin: {
        city: originCity,
        state: originStateVal
      },
      destination: {
        city: destCity,
        state: destStateVal
      }
    };
  }, [destCity, destStateVal, laneKey, originCity, originStateVal]);

  useEffect(() => {
    if (!laneKey || !laneInput) {
      setOriginState(createEmptySideState());
      setDestinationState(createEmptySideState());
      setCoords({ originCoord: null, destinationCoord: null });
      return () => {};
    }

    let cancelled = false;
    const requestId = Date.now();
    requestRef.current = requestId;

    setOriginState((prev) => ({ ...prev, loading: true, error: null }));
    setDestinationState((prev) => ({ ...prev, loading: true, error: null }));

    (async () => {
      try {
        const result = await fetchCities(laneInput);

        if (cancelled || requestRef.current !== requestId) {
          return;
        }

        setOriginState({
          groups: result.originCities.groups,
          flat: normalizeCityList(result.originCities.flat),
          loading: false,
          error: null
        });
        setDestinationState({
          groups: result.destinationCities.groups,
          flat: normalizeCityList(result.destinationCities.flat),
          loading: false,
          error: null
        });
        setCoords({ originCoord: result.originCoord, destinationCoord: result.destinationCoord });
      } catch (unknownError) {
        const error = unknownError instanceof Error ? unknownError : new Error("Failed to fetch nearby cities");

        if (cancelled || requestRef.current !== requestId) {
          return;
        }
        setOriginState((prev) => ({ ...prev, loading: false, error }));
        setDestinationState((prev) => ({ ...prev, loading: false, error }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [laneInput, laneKey]);

  return {
    origin: originState,
    destination: destinationState,
    coords
  };
}

export default useNearbyCities;

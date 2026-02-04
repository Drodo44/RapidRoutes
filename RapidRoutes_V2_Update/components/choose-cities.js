import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Badge, Button, Card, Checkbox, Spinner } from "./EnterpriseUI";
import { useNearbyCities } from "../hooks/useNearbyCities";

function laneIdentity(lane) {
  if (!lane) {
    return "";
  }

  const parts = [
    lane.id ?? lane.lane_id ?? "",
    lane.origin_city ?? lane.originCity ?? "",
    lane.origin_state ?? lane.originState ?? "",
    lane.dest_city ?? lane.destinationCity ?? "",
    lane.dest_state ?? lane.destinationState ?? ""
  ];

  return parts.join("|");
}

export default function ChooseCities({ lane, onBack, onComplete }) {
  const router = useRouter();
  const { origin, destination, coords } = useNearbyCities(lane);

  const [originSel, setOriginSel] = useState({});
  const [destSel, setDestSel] = useState({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [performanceData, setPerformanceData] = useState({});
  const prefillApplied = useRef(false);

  const keyOf = useCallback((city) => {
    if (!city) return "";
    const code = city.kma_code ?? "";
    const cityName = city.city ?? city.origin_city ?? "";
    const state = city.state ?? city.state_or_province ?? city.origin_state ?? "";
    return `${code}|${cityName}|${state}`;
  }, []);

  const laneKey = useMemo(() => laneIdentity(lane), [lane]);

  // Fetch city performance data
  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        const response = await fetch('/api/city-performance');
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.stats) {
          // Create lookup map: "city|state|type" => stats
          const perfMap = {};
          data.stats.forEach(stat => {
            const key = `${stat.city}|${stat.state}|${stat.city_type}`;
            perfMap[key] = stat;
          });
          setPerformanceData(perfMap);
        }
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
      }
    };
    
    fetchPerformanceData();
  }, []);

  // Helper to get performance badge for a city
  const getPerformanceBadge = useCallback((city, cityType) => {
    const key = `${city.city}|${city.state}|${cityType}`;
    const stats = performanceData[key];
    
    if (!stats || stats.total_contacts === 0) {
      return { emoji: '🆕', label: 'New', color: '#6b7280' };
    }
    if (stats.total_contacts >= 10) {
      return { emoji: '🔥', label: 'Hot', color: '#ef4444' };
    }
    if (stats.total_contacts >= 5) {
      return { emoji: '⭐', label: 'Good', color: '#f59e0b' };
    }
    return { emoji: '🆕', label: 'New', color: '#6b7280' };
  }, [performanceData]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setOriginSel({});
    setDestSel({});
    prefillApplied.current = false;
  }, [laneKey]);

  const originList = origin?.flat ?? [];
  const destinationList = destination?.flat ?? [];

  useEffect(() => {
    if (!isHydrated || prefillApplied.current) {
      return;
    }

    if (!originList.length && !destinationList.length) {
      return;
    }

    try {
      const stored = window.sessionStorage.getItem("rr:selectedCities");
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored);
      if (!parsed || !parsed.lane) {
        return;
      }
      if (laneIdentity(parsed.lane) !== laneKey) {
        return;
      }

      const nextOrigin = {};
      (parsed.selectedOrigin || []).forEach((city) => {
        nextOrigin[keyOf(city)] = true;
      });

      const nextDestination = {};
      (parsed.selectedDestination || []).forEach((city) => {
        nextDestination[keyOf(city)] = true;
      });

      setOriginSel(nextOrigin);
      setDestSel(nextDestination);
      prefillApplied.current = true;
    } catch (error) {
      console.error("Failed to hydrate city selections", error);
    }
  }, [destinationList, isHydrated, keyOf, laneKey, originList]);

  const selectedOrigin = useMemo(
    () => originList.filter((city) => originSel[keyOf(city)]),
    [originList, originSel, keyOf]
  );

  const selectedDestination = useMemo(
    () => destinationList.filter((city) => destSel[keyOf(city)]),
    [destinationList, destSel, keyOf]
  );

  const totalPairs = useMemo(() => {
    return Math.min(selectedOrigin.length, selectedDestination.length);
  }, [selectedDestination.length, selectedOrigin.length]);

  const countsDiffer = useMemo(() => {
    return selectedOrigin.length !== selectedDestination.length;
  }, [selectedDestination.length, selectedOrigin.length]);

  const toggleSelection = useCallback((side, city) => {
    const key = keyOf(city);
    if (!key) return;

    if (side === "origin") {
      setOriginSel((prev) => {
        const next = { ...prev };
        if (next[key]) {
          delete next[key];
        } else {
          next[key] = true;
        }
        return next;
      });
    } else {
      setDestSel((prev) => {
        const next = { ...prev };
        if (next[key]) {
          delete next[key];
        } else {
          next[key] = true;
        }
        return next;
      });
    }
  }, [keyOf]);

  const toggleGroup = useCallback((side, cities) => {
    if (!Array.isArray(cities) || cities.length === 0) {
      return;
    }

    if (side === "origin") {
      const allSelected = cities.every((city) => originSel[keyOf(city)]);
      setOriginSel((prev) => {
        const next = { ...prev };
        cities.forEach((city) => {
          const key = keyOf(city);
          if (allSelected) {
            delete next[key];
          } else {
            next[key] = true;
          }
        });
        return next;
      });
    } else {
      const allSelected = cities.every((city) => destSel[keyOf(city)]);
      setDestSel((prev) => {
        const next = { ...prev };
        cities.forEach((city) => {
          const key = keyOf(city);
          if (allSelected) {
            delete next[key];
          } else {
            next[key] = true;
          }
        });
        return next;
      });
    }
  }, [destSel, keyOf, originSel]);

  const handleGenerateRecap = useCallback(() => {
    if (!isHydrated || !selectedOrigin.length || !selectedDestination.length) {
      return;
    }

    const payload = {
      lane,
      selectedOrigin,
      selectedDestination,
      coords,
      ts: Date.now()
    };

    try {
      window.sessionStorage.setItem("rr:selectedCities", JSON.stringify(payload));
    } catch (error) {
      console.error("Unable to persist selected cities", error);
    }

    if (typeof onComplete === "function") {
      onComplete(payload);
      return;
    }

    router.push("/post-options");
  }, [coords, isHydrated, lane, onComplete, router, selectedDestination, selectedOrigin]);

  const loading = origin?.loading || destination?.loading;
  const error = origin?.error || destination?.error;

  if (!lane) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-gray-400">
        <span>No lane selected.</span>
      </div>
    );
  }

  if (loading && !originList.length && !destinationList.length) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Card className="p-6 max-w-md text-center">
          <p className="text-red-400">{error.message || "Unable to load nearby cities."}</p>
          <Button
            className="mt-4"
            variant="ghost"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const originGroups = origin?.groups || {};
  const destinationGroups = destination?.groups || {};

  const originCity = lane.origin_city ?? lane.originCity;
  const originState = lane.origin_state ?? lane.originState;
  const destinationCity = lane.dest_city ?? lane.destinationCity;
  const destinationState = lane.dest_state ?? lane.destinationState;

  const renderGroup = (side, groups) => (
    Object.entries(groups).map(([code, cities]) => {
      const selectedCount = cities.filter((city) => (
        side === "origin" ? originSel[keyOf(city)] : destSel[keyOf(city)]
      )).length;

      return (
        <div key={code} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Badge variant="kma">{code}</Badge>
              <span className="text-sm text-gray-400">
                {cities.length} cities • {selectedCount} selected
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleGroup(side, cities)}
            >
              {selectedCount === cities.length ? "Clear" : "Select All"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {cities.map((city) => {
              const key = keyOf(city);
              const milesValue = typeof city.miles === "number" ? Math.round(city.miles) : "—";
              const badge = getPerformanceBadge(city, side);
              const label = `${city.city}, ${city.state} (${milesValue} mi)`;
              const checked = side === "origin" ? Boolean(originSel[key]) : Boolean(destSel[key]);

              return (
                <div key={key} style={{ position: 'relative' }}>
                  <Checkbox
                    checked={checked}
                    onChange={() => toggleSelection(side, city)}
                    label={label}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: `${badge.color}15`,
                    color: badge.color,
                    fontWeight: 600,
                    pointerEvents: 'none'
                  }}>
                    {badge.emoji}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    })
  );

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => (typeof onBack === "function" ? onBack() : router.back())}
            className="mb-4"
          >
            ← Back to Lanes
          </Button>
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Choose Cities to Post</h1>
          <p className="text-gray-400">
            Select 5-10 cities for pickup and delivery. Cities are grouped by KMA.
          </p>
        </div>

        <Card className="mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex gap-8">
              <div>
                <span className="text-gray-400">Origin Cities:</span>
                <span className="ml-2 text-xl font-bold text-blue-400">{selectedOrigin.length}</span>
              </div>
              <div>
                <span className="text-gray-400">Destination Cities:</span>
                <span className="ml-2 text-xl font-bold text-blue-400">{selectedDestination.length}</span>
              </div>
              <div>
                <span className="text-gray-400">Pairs Ready:</span>
                <span className="ml-2 text-xl font-bold text-green-400">{totalPairs}</span>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2">
              {countsDiffer && (
                <span className="text-sm text-amber-400">
                  Origin and destination counts differ; extra cities will be ignored.
                </span>
              )}
              <Button
                variant="primary"
                onClick={handleGenerateRecap}
                disabled={!selectedOrigin.length || !selectedDestination.length}
              >
                Generate Recap
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-1">Pickup Cities</h2>
            <p className="text-sm text-gray-400 mb-6">
              From: {originCity}, {originState}
            </p>
            {Object.keys(originGroups).length === 0 ? (
              <p className="text-gray-500 italic">No nearby cities found</p>
            ) : (
              renderGroup("origin", originGroups)
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-1">Delivery Cities</h2>
            <p className="text-sm text-gray-400 mb-6">
              To: {destinationCity}, {destinationState}
            </p>
            {Object.keys(destinationGroups).length === 0 ? (
              <p className="text-gray-500 italic">No nearby cities found</p>
            ) : (
              renderGroup("destination", destinationGroups)
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Button, Card, Spinner } from "./EnterpriseUI";
import { haversineMiles } from "../utils/distance";

function loadSelection() {
  if (typeof window === "undefined") {
    return { status: "loading", payload: null };
  }

  try {
    const stored = window.sessionStorage.getItem("rr:selectedCities");
    if (!stored) {
      return { status: "empty", payload: null };
    }

    const parsed = JSON.parse(stored);
    if (!parsed || !parsed.lane) {
      return { status: "empty", payload: null };
    }

    return { status: "ready", payload: parsed };
  } catch (error) {
    console.error("Failed to parse stored selections", error);
    return { status: "error", payload: null, error };
  }
}

export default function PostOptions({ onBack, renderActions }) {
  const router = useRouter();
  const [state, setState] = useState(() => ({ status: "loading", payload: null }));

  useEffect(() => {
    setState(loadSelection());
  }, []);

  const pairs = useMemo(() => {
    if (state.status !== "ready" || !state.payload) {
      return [];
    }

    const { lane, selectedOrigin = [], selectedDestination = [] } = state.payload;
    const count = Math.min(selectedOrigin.length, selectedDestination.length);
    const result = [];

    for (let index = 0; index < count; index += 1) {
      const pickup = selectedOrigin[index];
      const drop = selectedDestination[index];
      let miles = typeof lane?.distance === "number" ? Math.round(lane.distance) : null;

      if (
        pickup && drop &&
        typeof pickup.lat === "number" &&
        typeof pickup.lon === "number" &&
        typeof drop.lat === "number" &&
        typeof drop.lon === "number"
      ) {
        try {
          miles = Math.round(
            haversineMiles({
              lat1: pickup.lat,
              lon1: pickup.lon,
              lat2: drop.lat,
              lon2: drop.lon
            })
          );
        } catch (error) {
          console.error("Failed to compute haversine miles", error);
        }
      }

      result.push({ lane, pickup, drop, miles });
    }

    return result;
  }, [state]);

  const selection = state.status === "ready" ? state.payload : null;
  const countsDiffer = selection
    ? selection.selectedOrigin.length !== selection.selectedDestination.length
    : false;

  const originCount = selection?.selectedOrigin?.length || 0;
  const destinationCount = selection?.selectedDestination?.length || 0;
  const lane = selection?.lane || null;

  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }
    router.push("/lanes");
  };

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Card className="max-w-md p-6 text-center">
          <p className="text-red-400">Unable to load recap selections.</p>
          <Button className="mt-4" variant="ghost" onClick={handleBack}>
            Back to Lanes
          </Button>
        </Card>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Card className="max-w-md p-6 text-center space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-100">No selected cities</h2>
            <p className="text-sm text-gray-400">
              Choose pickup and delivery cities before generating recap options.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push("/lanes")}
          >
            Select Cities
          </Button>
        </Card>
      </div>
    );
  }

  const actionNode = typeof renderActions === "function" ? renderActions({ pairs, selection }) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Recap Pairs</h1>
            <p className="text-sm text-gray-400">
              {lane?.origin_city ?? lane?.originCity}, {lane?.origin_state ?? lane?.originState} → {" "}
              {lane?.dest_city ?? lane?.destinationCity}, {lane?.dest_state ?? lane?.destinationState}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actionNode}
            <Button variant="ghost" onClick={handleBack}>
              ← Back
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex gap-8">
              <div>
                <span className="text-gray-400">Origin Cities:</span>
                <span className="ml-2 text-xl font-bold text-blue-400">{originCount}</span>
              </div>
              <div>
                <span className="text-gray-400">Destination Cities:</span>
                <span className="ml-2 text-xl font-bold text-blue-400">{destinationCount}</span>
              </div>
              <div>
                <span className="text-gray-400">Valid Pairs:</span>
                <span className="ml-2 text-xl font-bold text-green-400">{pairs.length}</span>
              </div>
            </div>
            {countsDiffer && (
              <span className="text-sm text-amber-400">
                Extra cities will be ignored when generating recap pairs.
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-900/60">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    #
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Pickup City
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Delivery City
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Miles
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pairs.map((pair, index) => (
                  <tr key={`${pair.pickup.city}|${pair.drop.city}|${index}`} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-100">
                        {pair.pickup.city}, {pair.pickup.state}
                      </div>
                      <div className="text-xs text-gray-500">KMA {pair.pickup.kma_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-100">
                        {pair.drop.city}, {pair.drop.state}
                      </div>
                      <div className="text-xs text-gray-500">KMA {pair.drop.kma_code}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-200">
                      {typeof pair.miles === "number" ? `${pair.miles} mi` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

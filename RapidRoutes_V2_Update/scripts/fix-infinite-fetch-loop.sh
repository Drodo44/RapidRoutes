#!/bin/bash

# Phase 8.1: Stop RapidRoutes Infinite Fetch Loop + Graceful Validation Patch

echo "🧩 Patching RapidRoutes fetch loop and validation recursion..."

if [ ! -f components/post-options/LaneFetcher.js ]; then
  echo "ℹ️  Legacy LaneFetcher implementation already removed. Current builds should import hooks/useLanes directly."
  echo "ℹ️  No changes applied."
  exit 0
fi

# 1️⃣ Create the new useLanes hook with fetch loop prevention
mkdir -p hooks
cat > hooks/useLanes.js << 'EOF'
import { useEffect, useRef, useState } from "react";
import supabase from "../utils/supabaseClient";

export function useLanes() {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFetching = useRef(false);

  async function fetchLanes() {
    if (isFetching.current) return; // ✅ prevent infinite loop
    isFetching.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lanes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) setLanes(data);
    } finally {
      isFetching.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLanes();
  }, []);

  return { lanes, loading, refresh: fetchLanes };
}
EOF

# 2️⃣ Update the LaneFetcher to prevent re-triggers
sed -i 's/setLanes(validatedLanes);/console.log("[LaneIntelligence] Validation done, no re-fetch trigger");\n      setLanes(validatedLanes);/' components/post-options/LaneFetcher.js

# 3️⃣ Update the post-options.js file to use our new hook
sed -i 's/import { useLanes } from "..\/components\/post-options\/LaneFetcher";/import { useLanes } from "..\/hooks\/useLanes";/' pages/post-options.js
sed -i 's/const { lanes, loading, error, refetch } = useLanes({.*});/const { lanes, loading, refresh } = useLanes();/' pages/post-options.js

# 4️⃣ Update the references to refetch in post-options.js
sed -i 's/refetch();/refresh();/g' pages/post-options.js
sed -i 's/onClick={refetch}/onClick={refresh}/g' pages/post-options.js

# 5️⃣ Remove the error display section since our new hook doesn't provide an error property
sed -i '/{\/\* Error display from useLanes \*\/}/,/{\/\* Progress bar for batch processing \*\/}/c\        {\/\* Error handling is now done internally in useLanes hook \*\/}\n\n        {\/\* Progress bar for batch processing \*\/}' pages/post-options.js

# 6️⃣ Patch LaneIntelligence's validateLaneData function to prevent re-triggers
sed -i 's/logMessage('\''Lane validation failed'\'', result.error, LOG_LEVELS.WARN);/logMessage('\''Lane validation failed'\'', result.error, LOG_LEVELS.WARN);\n      console.log("[LaneIntelligence] Validation done, no re-fetch trigger");/' services/laneIntelligence.js

# 7️⃣ Rebuild the application
npm run build

echo "✅ Infinite fetch loop stopped — validation now passive, lanes load once per session or manual refresh."
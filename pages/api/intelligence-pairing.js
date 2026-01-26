/**
 * 🔒 LOCKED FILE: DO NOT MODIFY WITHOUT APPROVAL
 * This file powers the intelligence pairing logic.
 * Any changes MUST follow the rules in PAIRING_LOGIC_RECIPE.md.
 * Fallbacks are disabled unless explicitly triggered.
 */

// Minimal stable echo-style handler for intelligence pairing
const HERE_API_KEY = process.env.HERE_API_KEY; // server-only secure HERE key

async function fetchHereZip3Server(city, state) {
  if (!HERE_API_KEY) {
    console.error('[HERE] Missing HERE_API_KEY (server)');
    return null;
  }
  try {
    const query = `${city}, ${state}`;
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(query)}&apiKey=${HERE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`[HERE server] API error: ${res.status}`);
    const data = await res.json();
    const postal = data.items?.[0]?.address?.postalCode;
    return postal ? postal.slice(0, 3) : null;
  } catch (e) {
    console.error('[HERE server] fetch error:', e.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      originCity, originState, originZip3,
      destinationCity, destinationState, destinationZip3,
      equipmentCode,
    } = req.body || {};

    if (!originCity || !originState || !destinationCity || !destinationState) {
      return res.status(400).json({ error: "Missing required city/state fields" });
    }
    // If a zip3 is missing, attempt a server-side HERE fetch as a last resort (keeps minimal logic stable)
    let missing = [];
    let oZip3 = originZip3;
    let dZip3 = destinationZip3;
    if (!oZip3) missing.push('origin');
    if (!dZip3) missing.push('destination');

    if (missing.length) {
      if (!oZip3) oZip3 = await fetchHereZip3Server(originCity, originState) || null;
      if (!dZip3) dZip3 = await fetchHereZip3Server(destinationCity, destinationState) || null;
    }

    if (!oZip3 || !dZip3) {
      return res.status(400).json({ error: "Missing zip3s" });
    }

    console.log("[PAIRING] Received:", {
      originCity, originState, originZip3: oZip3,
      destinationCity, destinationState, destinationZip3: dZip3,
      equipmentCode,
    });

    return res.status(200).json({
      success: true,
      pairing: {
        origin: { city: originCity, state: originState, zip3: oZip3 },
        destination: { city: destinationCity, state: destinationState, zip3: dZip3 },
        equipmentCode: equipmentCode || "FD",
      },
    });
  } catch (err) {
    console.error("[PAIRING] Unexpected error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}

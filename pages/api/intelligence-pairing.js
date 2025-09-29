/**
 * 🔒 LOCKED FILE: DO NOT MODIFY WITHOUT APPROVAL
 * This file powers the intelligence pairing logic.
 * Any changes MUST follow the rules in PAIRING_LOGIC_RECIPE.md.
 * Fallbacks are disabled unless explicitly triggered.
 */

// Minimal stable echo-style handler for intelligence pairing
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
    if (!originZip3 || !destinationZip3) {
      return res.status(400).json({ error: "Missing zip3s" });
    }

    console.log("[PAIRING] Received:", {
      originCity, originState, originZip3,
      destinationCity, destinationState, destinationZip3,
      equipmentCode,
    });

    return res.status(200).json({
      success: true,
      pairing: {
        origin: { city: originCity, state: originState, zip3: originZip3 },
        destination: { city: destinationCity, state: destinationState, zip3: destinationZip3 },
        equipmentCode: equipmentCode || "FD",
      },
    });
  } catch (err) {
    console.error("[PAIRING] Unexpected error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}

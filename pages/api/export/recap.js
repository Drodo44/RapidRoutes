// pages/api/export/recap.js
export default function handler(_req, res) {
  // This endpoint is deprecated; recap is HTML-only now.
  return res.status(410).json({ error: "Deprecated. Use the HTML Recap exporter." });
}

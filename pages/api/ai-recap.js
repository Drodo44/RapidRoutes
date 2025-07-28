// /pages/api/ai-recap.js
export default function handler(req, res) {
  res.status(200).json({
    insight: "Lanes with high RRSI and top 10 crawl markets are most likely to generate calls within 12 hours."
  });
}

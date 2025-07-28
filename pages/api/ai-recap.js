export default async function handler(req, res) {
  try {
    const insights = `Market Update: Most lanes stable, with mild rate pressure in Midwest.
Weather: Clear conditions for all active postings, no major delays expected.`;
    res.status(200).json({ insights });
  } catch (err) {
    res.status(500).json({ error: "AI recap generation failed." });
  }
}

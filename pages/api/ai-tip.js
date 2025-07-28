export default async function handler(req, res) {
  try {
    const tip = `Post your lanes during morning peak (6–9 AM) for best driver response.
Prioritize high-traction markets to reduce call time.`;
    res.status(200).json({ tip });
  } catch (err) {
    res.status(500).json({ error: "AI tip generation failed." });
  }
}

import { generateDatCsv } from '../../lib/datcrawl';

export default async function handler(req, res) {
  try {
    const csv = await generateDatCsv();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="DAT_Upload.csv"');
    res.status(200).send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
}

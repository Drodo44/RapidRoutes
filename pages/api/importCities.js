import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const { data: file, error: fileError } = await supabase
      .storage
      .from('cities')
      .download('allCitiesCleaned.js');

    if (fileError || !file) {
      return res.status(500).json({ error: 'Could not download file from storage.' });
    }

    const text = await file.text();
    const cleaned = text.replace('export default', '').trim();
    const cities = JSON.parse(cleaned);

    const { error: insertError } = await supabase.from('cities').insert(cities);

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(200).json({ message: `Successfully imported ${cities.length} cities.` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Must use service key
);

export default async function handler(req: Request): Promise<Response> {
  // Get the file from Storage
  const { data: file } = await supabase.storage.from('cities').download('allCitiesCleaned.js');
  const text = await file?.text();

  if (!text) {
    return new Response('Could not read file', { status: 500 });
  }

  // Clean the text (remove export default and parse JSON)
  const cleaned = text.replace('export default', '').trim();
  const cities = JSON.parse(cleaned);

  // Insert into the database
  const { error } = await supabase.from('cities').insert(cities);
  if (error) {
    return new Response(JSON.stringify(error), { status: 500 });
  }

  return new Response(`Imported ${cities.length} cities`, { status: 200 });
}

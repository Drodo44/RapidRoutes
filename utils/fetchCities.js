import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://gwhjxomavulwduhvgvi.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ"
);

export default async function fetchCitiesFromSupabase() {
  const { data, error } = await supabase
    .from("cities")
    .select("city, state_or_province, zip, latitude, longitude, kma_code, kma_name, region, freight_score");

  if (error) throw new Error(error.message);
  return data;
}

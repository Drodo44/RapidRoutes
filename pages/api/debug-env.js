// Temporary endpoint to verify critical env vars
export default function handler(req, res) {
  const keys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'HERE_API_KEY'
  ];
  const result = {};
  keys.forEach(key => {
    result[key] = Boolean(process.env[key]);
  });
  // Only show SUPABASE_SERVICE_KEY if SUPABASE_SERVICE_ROLE_KEY is not present
  if (!result['SUPABASE_SERVICE_ROLE_KEY'] && result['SUPABASE_SERVICE_KEY']) {
    result['SUPABASE_SERVICE_ROLE_KEY'] = result['SUPABASE_SERVICE_KEY'];
    delete result['SUPABASE_SERVICE_KEY'];
  }
  res.status(200).json(result);
}

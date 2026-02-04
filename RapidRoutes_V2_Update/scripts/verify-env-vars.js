// Script to fetch and print /api/debug-env results
import fetch from 'node-fetch';

const url = process.env.VERCEL_URL || 'https://rapid-routes.vercel.app/api/debug-env';

(async () => {
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Env var status:', data);
    // Save to file for FINAL_PRODUCTION_VERIFICATION.md
    require('fs').writeFileSync('env-var-status.json', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to fetch env var status:', err);
    process.exit(1);
  }
})();

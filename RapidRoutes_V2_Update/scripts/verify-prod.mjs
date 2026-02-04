import fetch from 'node-fetch';

const endpoints = [
  '/api/laneRecords',
  '/api/lanes/crawl-cities',
  '/recap',
  '/preview',
  '/smart-recap',
];

function normalizeBase(url) {
  if (!url) return 'https://rapid-routes.vercel.app';
  return url.startsWith('http') ? url : `https://${url}`;
}

const base = normalizeBase(process.env.VERCEL_URL);

async function main() {
  const results = await Promise.all(
    endpoints.map(async (ep) => {
      try {
        const res = await fetch(base + ep, { method: 'GET' });
        return { ep, status: res.status };
      } catch (err) {
        return { ep, status: 'ERR', error: err.message };
      }
    })
  );

  console.table(results);

  const failed = results.some(r => r.status !== 200);
  if (failed) {
    console.error(`One or more endpoints failed against ${base}`);
    process.exit(1);
  }
}

await main();

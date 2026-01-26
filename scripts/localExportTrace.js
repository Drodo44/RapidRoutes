/**
 * Local export trace runner
 * Simulates an authenticated request to /api/exportDatCsv with mock Supabase data
 * Captures instrumentation logs without changing production code paths.
 */

process.env.TEST_MODE_SIMPLE_ROWS = '1';

// Provide a global override for adminSupabase (respected in supabaseClient.js)
const mockLanes = [
  {
    id: 'L1-null', status: 'pending', pickup_earliest: null, pickup_latest: null,
    origin_city: 'Cincinnati', origin_state: 'OH', dest_city: 'Chicago', dest_state: 'IL',
    equipment_code: 'V', length_ft: 53, weight_lbs: 42000, randomize_weight: false,
    created_at: new Date(Date.now() - 1000).toISOString()
  },
  {
    id: 'L2-iso', status: 'pending', pickup_earliest: new Date().toISOString(), pickup_latest: new Date(Date.now()+86400000).toISOString(),
    origin_city: 'Columbus', origin_state: 'OH', dest_city: 'Atlanta', dest_state: 'GA',
    equipment_code: 'V', length_ft: 53, weight_lbs: 41000, randomize_weight: false,
    created_at: new Date(Date.now() - 900).toISOString()
  },
  {
    id: 'L3-mmdd', status: 'pending', pickup_earliest: '09/30/2025', pickup_latest: '10/01/2025',
    origin_city: 'Dayton', origin_state: 'OH', dest_city: 'Nashville', dest_state: 'TN',
    equipment_code: 'V', length_ft: 53, weight_lbs: 40000, randomize_weight: false,
    created_at: new Date(Date.now() - 800).toISOString()
  }
];

function makeQuery(data) {
  const query = {
    _data: data,
    select() { return this; },
    order() { return this; },
    eq() { return this; },
    gte() { return this; },
    limit() { return Promise.resolve({ data: this._data, error: null }); },
    update() { return this; },
    in() { return Promise.resolve({ data: null, error: null }); }
  };
  return query;
}

globalThis.__RR_ADMIN_SUPABASE_OVERRIDE = {
  from(table) {
    if (table === 'lanes') return makeQuery(mockLanes);
    if (table === 'profiles') return {
      select() { return this; },
      eq() { return this; },
      single() { return Promise.resolve({ data: { id: 'user1', role: 'Admin', active: true, status: 'approved' }, error: null }); }
    };
    return makeQuery([]);
  }
};

// Minimal mock request/response
function createReq() {
  return {
    method: 'GET',
    headers: { authorization: 'Bearer test-token' },
    query: { pending: '1', part: '1' }
  };
}

function createRes() {
  const chunks = [];
  return {
    statusCode: 200,
    headers: {},
    setHeader(k,v){ this.headers[k]=v; },
    status(code){ this.statusCode = code; return this; },
    json(obj){
      console.log('--- JSON RESPONSE ---');
      console.log(JSON.stringify(obj,null,2));
      return this;
    },
    end(data){ if (data) chunks.push(data); this._ended=true; },
    write(data){ chunks.push(data); },
    get body(){ return chunks.join(''); }
  };
}

async function run() {
  const { default: handler } = await import('../pages/api/exportDatCsv.js');
  const req = createReq();
  const res = createRes();
  console.log('### START LOCAL EXPORT TRACE ###');
  await handler(req,res);
  if (res.body && !res.body.startsWith('{')) {
    const lines = res.body.split('\n').slice(0,2);
    console.log('--- CSV FIRST 2 LINES ---');
    lines.forEach((l,i)=>console.log(`LINE${i}: ${l}`));
  }
  console.log('### END LOCAL EXPORT TRACE ###');
}

run().catch(err => {
  console.error('Trace script failed:', err);
  process.exit(1);
});

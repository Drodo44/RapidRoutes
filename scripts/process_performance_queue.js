#!/usr/bin/env node
/*
 Simple worker to process performance_queue entries.
 Run this as a cron job or serverless function. It requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
*/
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Supabase URL or service role key not set.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function processOne() {
  const { data: rows, error } = await supabase
    .from('performance_queue')
    .select('*')
    .eq('processed', false)
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Failed to fetch queue rows:', error);
    return;
  }

  for (const row of rows || []) {
    const payload = row.payload || {};
    try {
      // Insert into lane_performance
      const { data: lanePerf, error: lpErr } = await supabase
        .from('lane_performance')
        .insert([
          {
            lane_id: payload.lane_id,
            equipment_code: (payload.equipment_code || '').toUpperCase(),
            origin_city: payload.origin_city,
            origin_state: (payload.origin_state || '').toUpperCase(),
            dest_city: payload.dest_city,
            dest_state: (payload.dest_state || '').toUpperCase(),
            crawl_cities: payload.crawl_cities || [],
            success_metrics: payload.intelligence_metadata || {}
          }
        ])
        .select()
        .single();

      if (lpErr) throw lpErr;

      const crawlRecords = [];
      for (const c of (payload.crawl_cities || [])) {
        if (c.pickup) crawlRecords.push({ lane_performance_id: lanePerf.id, city: c.pickup.city, state: c.pickup.state, kma_code: c.pickup.kma_code, position_type: 'pickup', intelligence_score: c.score || 0.5 });
        if (c.delivery) crawlRecords.push({ lane_performance_id: lanePerf.id, city: c.delivery.city, state: c.delivery.state, kma_code: c.delivery.kma_code, position_type: 'delivery', intelligence_score: c.score || 0.5 });
      }

      if (crawlRecords.length > 0) {
        const { error: cErr } = await supabase.from('crawl_city_performance').insert(crawlRecords);
        if (cErr) console.warn('Failed to insert crawlRecords:', cErr);
      }

      await supabase.from('performance_queue').update({ processed: true, processed_at: new Date().toISOString() }).eq('id', row.id);
      console.log('Processed queue row', row.id);
    } catch (err) {
      console.error('Failed to process queue row', row.id, err.message || err);
      const attempts = (row.attempts || 0) + 1;
      await supabase.from('performance_queue').update({ attempts, last_error: String(err.message || err) }).eq('id', row.id);
    }
  }
}

async function main() {
  await processOne();
}

main().catch(e => { console.error(e); process.exit(1); });

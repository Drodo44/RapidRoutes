// pages/api/datMaps.js
// API endpoint for DAT market heat map data


export default async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, message: 'Method not allowed' });
    }

    const { equipment = 'dry-van' } = req.query;

    // Try to get cached data from database
    const { data: cachedData, error: fetchError } = await supabaseAdmin
      .from('dat_maps')
      .select('*')
      .eq('equipment', equipment)
      .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Within last 7 days
      .order('updated_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.warn('[datMaps API] Database fetch error:', fetchError);
    }

    if (cachedData && cachedData.length > 0) {
      return res.status(200).json({ ok: true, data: cachedData[0].map_data });
    }

    // If no cached data, return sample data for now
    const sampleData = {
      'dry-van': {
        avgRate: '$2.45',
        loadVolume: '15,234',
        truckVolume: '12,891',
        hotMarkets: ['Atlanta, GA', 'Dallas, TX', 'Chicago, IL', 'Phoenix, AZ'],
        lastUpdated: new Date().toISOString()
      },
      'reefer': {
        avgRate: '$2.89',
        loadVolume: '8,567',
        truckVolume: '6,234',
        hotMarkets: ['Fresno, CA', 'Miami, FL', 'McAllen, TX', 'Yakima, WA'],
        lastUpdated: new Date().toISOString()
      },
      'flatbed': {
        avgRate: '$2.76',
        loadVolume: '6,891',
        truckVolume: '5,432',
        hotMarkets: ['Houston, TX', 'Pittsburgh, PA', 'Birmingham, AL', 'Gary, IN'],
        lastUpdated: new Date().toISOString()
      }
    };

    const data = sampleData[equipment] || sampleData['dry-van'];
    
    // Cache the sample data (don't fail if this errors)
    try {
      await supabaseAdmin
        .from('dat_maps')
        .upsert({
          equipment: equipment,
          map_data: data,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'equipment',
          ignoreDuplicates: false 
        });
    } catch (cacheError) {
      console.warn('[datMaps API] Cache write error:', cacheError);
    }

    return res.status(200).json({ ok: true, data });

  } catch (err) {
    console.error('[datMaps API ERROR]', err);
    return res.status(500).json({ ok: false, message: err.message || 'Failed to fetch market data' });
  }
}

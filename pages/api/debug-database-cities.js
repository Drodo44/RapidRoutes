// pages/api/debug-database-cities.js
import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  try {
    console.log('🔍 Testing database city queries...');
    
    // Test exact queries that definitiveIntelligent.js uses
    const { data: originData, error: originError } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name, here_verified')
      .ilike('city', 'New York')
      .ilike('state_or_province', 'NY')
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .order('here_verified', { ascending: false })
      .limit(5);

    const { data: destData, error: destError } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name, here_verified')
      .ilike('city', 'Los Angeles')
      .ilike('state_or_province', 'CA')
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .order('here_verified', { ascending: false })
      .limit(5);
      
    // Also test without the kma_code filter
    const { data: originDataNoKMA, error: originErrorNoKMA } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name, here_verified')
      .ilike('city', 'New York')
      .ilike('state_or_province', 'NY')
      .not('latitude', 'is', null)
      .limit(5);

    const { data: destDataNoKMA, error: destErrorNoKMA } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name, here_verified')
      .ilike('city', 'Los Angeles')
      .ilike('state_or_province', 'CA')
      .not('latitude', 'is', null)
      .limit(5);

    res.status(200).json({
      success: true,
      queries: {
        originWithKMA: {
          count: originData?.length || 0,
          error: originError?.message || null,
          firstResult: originData?.[0] || null
        },
        destWithKMA: {
          count: destData?.length || 0,
          error: destError?.message || null,
          firstResult: destData?.[0] || null
        },
        originWithoutKMA: {
          count: originDataNoKMA?.length || 0,
          error: originErrorNoKMA?.message || null,
          firstResult: originDataNoKMA?.[0] || null
        },
        destWithoutKMA: {
          count: destDataNoKMA?.length || 0,
          error: destErrorNoKMA?.message || null,
          firstResult: destDataNoKMA?.[0] || null
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}

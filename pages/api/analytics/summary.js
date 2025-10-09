import { adminSupabase as supabase } from '../../../utils/supabaseClient';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== "GET") return res.status(405).end();

  try {
    const [activeLanesResult, archivedLanesResult] = await Promise.all([
      // Count active lanes
      supabase
        .from('lanes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      
      // Count archived lanes
      supabase
        .from('lanes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'archived')
    ]);

    // Optional: recap table may not exist everywhere; tolerate errors
    let recapCount = 0;
    try {
      const { count } = await supabase.from("recap").select("id", { count: "exact", head: true });
      recapCount = count || 0;
    } catch (_) {}

    // Get 5 most recent lanes with full details
    const recentLanesResult = await supabase
      .from('lanes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    // Calculate totals
    const activeLanes = activeLanesResult.count || 0;
    const archivedLanes = archivedLanesResult.count || 0;
    const totalLanes = activeLanes + archivedLanes;
    const recentLanes = recentLanesResult.data || [];

    return res.status(200).json({
      ok: true,
      totalLanes,
      activeLanes,
      archivedLanes,
      recapCount,
      recentLanes,
      currentCount: activeLanes, // For backwards compatibility
      archivedCount: archivedLanes // For backwards compatibility
    });
  } catch (error) {
    console.error('API Error - Analytics Summary:', error);
    
    // Return error but with safe defaults to prevent UI breakage
    return res.status(200).json({
      ok: false,
      error: String(error),
      totalLanes: 0,
      activeLanes: 0, 
      archivedLanes: 0,
      recapCount: 0,
      recentLanes: [],
      currentCount: 0,
      archivedCount: 0
    });
  }
}
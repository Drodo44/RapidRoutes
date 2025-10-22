// pages/api/exportRecapHtml.js
// Generate downloadable HTML recap for team sharing

import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { laneId } = req.query;
    
    if (!laneId) {
      return res.status(400).json({ error: 'Lane ID required' });
    }

    // Get lane data
    const { data: lane, error: laneError } = await supabase
      .from('lanes')
      .select('*')
      .eq('id', laneId)
      .single();

    if (laneError || !lane) {
      return res.status(404).json({ error: 'Lane not found' });
    }

    // Get tracking data
    const { data: trackingData } = await supabase
      .from('recap_tracking')
      .select('*')
      .eq('lane_id', laneId)
      .order('created_at', { ascending: false });

    // Generate HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lane Recap - ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #e5e7eb;
            background: #111827;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: #1f2937;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #374151;
            padding-bottom: 20px;
        }
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #3b82f6;
            margin: 0;
        }
        .subtitle {
            color: #9ca3af;
            margin: 10px 0 0 0;
        }
        .lane-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
            padding: 20px;
            background: #374151;
            border-radius: 8px;
        }
        .info-item {
            text-align: center;
        }
        .info-label {
            font-weight: bold;
            color: #9ca3af;
            font-size: 14px;
            margin-bottom: 5px;
        }
        .info-value {
            font-size: 18px;
            color: #e5e7eb;
        }
        .performance-section {
            margin: 30px 0;
        }
        .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 15px;
            border-left: 4px solid #10b981;
            padding-left: 15px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background: #374151;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-number {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-label {
            color: #9ca3af;
            font-size: 14px;
        }
        .email-stat { color: #fbbf24; }
        .call-stat { color: #3b82f6; }
        .covered-stat { color: #10b981; }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #374151;
            padding-top: 20px;
        }
        .logo {
            color: #3b82f6;
            font-weight: bold;
            font-size: 16px;
        }
        @media print {
            body { background: white; color: black; }
            .container { box-shadow: none; background: white; }
            .lane-info, .stat-card { background: #f3f4f6; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">Lane Performance Recap</h1>
            <p class="subtitle">${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}</p>
        </div>

        <div class="lane-info">
            <div class="info-item">
                <div class="info-label">Equipment</div>
                <div class="info-value">${lane.equipment_code}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Weight</div>
                <div class="info-value">${lane.weight_lbs?.toLocaleString() || 'N/A'} lbs</div>
            </div>
            <div class="info-item">
                <div class="info-label">Length</div>
                <div class="info-value">${lane.length_ft || 'N/A'}′</div>
            </div>
            <div class="info-item">
                <div class="info-label">Pickup Date</div>
                <div class="info-value">${lane.pickup_earliest || 'N/A'}</div>
            </div>
        </div>

        <div class="performance-section">
            <h2 class="section-title">Performance Summary</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number email-stat">${trackingData?.filter(t => t.action_type === 'email').length || 0}</div>
                    <div class="stat-label">Emails Sent</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number call-stat">${trackingData?.filter(t => t.action_type === 'call').length || 0}</div>
                    <div class="stat-label">Calls Made</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number covered-stat">${trackingData?.filter(t => t.action_type === 'covered').length || 0}</div>
                    <div class="stat-label">Loads Covered</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="logo">RapidRoutes</div>
            <div>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
            <div>Freight Brokerage Intelligence Platform</div>
        </div>
    </div>
</body>
</html>`;

    // Set headers for file download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="recap-${lane.origin_city}-${lane.dest_city}-${new Date().toISOString().split('T')[0]}.html"`);
    
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error generating recap HTML:', error);
    return res.status(500).json({ error: 'Failed to generate recap' });
  }
}

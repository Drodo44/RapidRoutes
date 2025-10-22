// pages/api/export/recap-html.js
// Export interactive HTML recap with embedded JavaScript

import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { lanes } = req.body;

    if (!lanes || !Array.isArray(lanes)) {
      return res.status(400).json({ error: 'Missing lanes array' });
    }

    // Group lanes by origin/destination
    const laneGroups = lanes.reduce((acc, lane) => {
      const key = `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          originCity: lane.origin_city,
          originState: lane.origin_state,
          destCity: lane.dest_city,
          destState: lane.dest_state,
          lanes: []
        };
      }
      acc[key].lanes.push(lane);
      return acc;
    }, {});

    const groupArray = Object.values(laneGroups);

    // Generate HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RapidRoutes Recap - ${new Date().toLocaleDateString()}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 20px;
    }
    
    .header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      margin-bottom: 24px;
    }
    
    .search-input, .lane-select {
      flex: 1;
      min-width: 200px;
      padding: 10px 16px;
      border-radius: 8px;
      border: 2px solid #475569;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 14px;
      outline: none;
    }
    
    .search-input:focus, .lane-select:focus {
      border-color: #06b6d4;
    }
    
    .lane-group {
      margin-bottom: 24px;
      border-radius: 12px;
      border: 2px solid #334155;
      background: #1e293b;
      overflow: hidden;
      transition: all 0.2s ease;
    }
    
    .lane-group.highlighted {
      border-color: #06b6d4;
      box-shadow: 0 0 20px rgba(6, 182, 212, 0.5);
    }
    
    .lane-header {
      padding: 16px 20px;
      background: #0f172a;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: background-color 0.2s;
    }
    
    .lane-header:hover {
      background: #1e293b;
    }
    
    .lane-header.highlighted {
      background: rgba(6, 182, 212, 0.1);
    }
    
    .lane-header-text {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 16px;
      font-weight: 700;
    }
    
    .lane-details {
      padding: 20px;
      overflow-x: auto;
    }
    
    .lane-details.collapsed {
      display: none;
    }
    
    table {
      width: 100%      border-collapse: collapse;
      font-size: 13px;
    }
    
    thead tr {
      border-bottom: 2px solid #334155;
    }
    
    th {
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
    }
    
    tbody tr {
      border-bottom: 1px solid #334155;
    }
    
    tbody tr:nth-child(even) {
      background: rgba(15, 23, 42, 0.3);
    }
    
    td {
      padding: 12px 8px;
    }
    
    .status-covered { color: #10b981; font-weight: 600; }
    .status-posted { color: #f59e0b; font-weight: 600; }
    .status-pending { color: #3b82f6; font-weight: 600; }
    
    .esc-hint {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 20px;
      background: rgba(6, 182, 212, 0.9);
      color: white;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: none;
    }
    
    .esc-hint.visible {
      display: block;
    }
    
    @media print {
      .header { position: relative; }
      .lane-details { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <input 
      type="text" 
      class="search-input" 
      id="searchInput" 
      placeholder="🔍 Search RR# or City..."
      value="RR"
    />
    <select class="lane-select" id="laneSelect">
      <option value="">🗂️ Select Lane...</option>
      ${groupArray
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(group => {
          const rrRange = group.lanes.length > 0 
            ? `${group.lanes[0].rr_number || 'N/A'}-${group.lanes[group.lanes.length - 1].rr_number || 'N/A'}`
            : 'N/A';
          return `<option value="${group.key}">${group.originCity}, ${group.originState} → ${group.destCity}, ${group.destState} (${rrRange})</option>`;
        }).join('')}
    </select>
  </div>

  <div id="lanesContainer">
    ${groupArray.map(group => {
      return `
        <div class="lane-group" data-lane-key="${group.key}" id="lane-${group.key.replace(/[^a-zA-Z0-9]/g, '-')}">
          <div class="lane-header" onclick="toggleLane('${group.key}')">
            <div class="lane-header-text">
              <span class="toggle-icon">▼</span>
              <span>🚚 ${group.originCity}, ${group.originState} → ${group.destCity}, ${group.destState}</span>
            </div>
            <div style="font-size: 14px; color: #94a3b8;">
              ${group.lanes.length} posting${group.lanes.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div class="lane-details">
            <table>
              <thead>
                <tr>
                  <th>RR#</th>
                  <th>Pickup</th>
                  <th>Orig KMA</th>
                  <th style="text-align: center;">±Mi</th>
                  <th>Drop</th>
                  <th>Dest KMA</th>
                  <th style="text-align: center;">±Mi</th>
                  <th>Status</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                ${group.lanes.map(lane => {
                  const statusLower = (lane.lane_status || lane.status || 'pending').toLowerCase();
                  let statusClass = 'status-pending';
                  let statusEmoji = '🔵';
                  let statusText = 'Pending';
                  
                  if (statusLower.includes('cover')) {
                    statusClass = 'status-covered';
                    statusEmoji = '🟢';
                    statusText = 'Covered';
                  } else if (statusLower.includes('post')) {
                    statusClass = 'status-posted';
                    statusEmoji = '🟡';
                    statusText = 'Posted';
                  }
                  
                  let sourceDisplay = '';
                  if (lane.coverage_source) {
                    const sourceUpper = lane.coverage_source.toUpperCase();
                    if (sourceUpper === 'IBC') sourceDisplay = '📞 IBC – Inbound Call';
                    else if (sourceUpper === 'OBC') sourceDisplay = '📤 OBC – Outbound Call';
                    else if (sourceUpper === 'EMAIL') sourceDisplay = '✉️ Email';
                    else sourceDisplay = lane.coverage_source;
                  }
                  
                  return `
                    <tr>
                      <td style="font-family: monospace; font-weight: 600;">${lane.rr_number || 'N/A'}</td>
                      <td>${lane.origin_city || 'N/A'}</td>
                      <td style="font-family: monospace;">${lane.origin_kma || 'N/A'}</td>
                      <td style="text-align: center;">+${lane.origin_miles_offset || 0}</td>
                      <td>${lane.dest_city || 'N/A'}</td>
                      <td style="font-family: monospace;">${lane.dest_kma || 'N/A'}</td>
                      <td style="text-align: center;">+${lane.dest_miles_offset || 0}</td>
                      <td>${statusEmoji} <span class="${statusClass}">${statusText}</span></td>
                      <td>${sourceDisplay}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('')}
  </div>

  <div class="esc-hint" id="escHint">Press ESC to clear highlight</div>

  <script>
    let collapsedLanes = new Set();
    let activeHighlight = null;

    // Toggle lane collapse
    function toggleLane(key) {
      const laneGroup = document.querySelector(\`[data-lane-key="\${key}"]\`);
      const details = laneGroup.querySelector('.lane-details');
      const icon = laneGroup.querySelector('.toggle-icon');
      
      if (collapsedLanes.has(key)) {
        collapsedLanes.delete(key);
        details.classList.remove('collapsed');
        icon.textContent = '▼';
      } else {
        collapsedLanes.add(key);
        details.classList.add('collapsed');
        icon.textContent = '▶';
      }
    }

    // Handle lane selection
    document.getElementById('laneSelect').addEventListener('change', function(e) {
      const key = e.target.value;
      if (!key) return;
      
      // Clear previous highlight
      document.querySelectorAll('.lane-group').forEach(el => el.classList.remove('highlighted'));
      document.querySelectorAll('.lane-header').forEach(el => el.classList.remove('highlighted'));
      
      // Highlight selected
      const laneGroup = document.querySelector('[data-lane-key="' + key + '"]');
      if (laneGroup) {
        laneGroup.classList.add('highlighted');
        laneGroup.querySelector('.lane-header').classList.add('highlighted');
        laneGroup.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Expand if collapsed
        if (collapsedLanes.has(key)) {
          toggleLane(key);
        }
        
        activeHighlight = key;
        document.getElementById('escHint').classList.add('visible');
      }
    });

    // Handle search
    document.getElementById('searchInput').addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase();
      
      document.querySelectorAll('.lane-group').forEach(group => {
        const key = group.getAttribute('data-lane-key').toLowerCase();
        const matchesKey = key.includes(query);
        const matchesRR = Array.from(group.querySelectorAll('td:first-child')).some(td => 
          td.textContent.toLowerCase().includes(query)
        );
        
        if (query === '' || query === 'rr' || matchesKey || matchesRR) {
          group.style.display = 'block';
        } else {
          group.style.display = 'none';
        }
      });
    });

    // ESC key to clear highlight
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.lane-group').forEach(el => el.classList.remove('highlighted'));
        document.querySelectorAll('.lane-header').forEach(el => el.classList.remove('highlighted'));
        document.getElementById('laneSelect').value = '';
        document.getElementById('escHint').classList.remove('visible');
        activeHighlight = null;
      }
    });
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="recap-${new Date().toISOString().split('T')[0]}.html"`);
    res.status(200).send(html);

  } catch (error) {
    console.error('Error generating HTML recap:', error);
    res.status(500).json({ error: error.message });
  }
}

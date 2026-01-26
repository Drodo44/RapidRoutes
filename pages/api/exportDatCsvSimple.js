import { format } from 'date-fns';
import supabaseAdmin from '@/lib/supabaseAdmin'; 

// ✅ DAT Template Headers (exact order from your verified file)
const HEADERS = [
  'Pickup Earliest*',
  'Pickup Latest',
  'Length (ft)*',
  'Weight (lbs)*',
  'Full/Partial*',
  'Equipment*',
  'Use Private Network*',
  'Private Network Rate',
  'Allow Private Network Booking',
  'Allow Private Network Bidding',
  'Use DAT Loadboard*',
  'DAT Loadboard Rate',
  'Allow DAT Loadboard Booking',
  'Use Extended Network',
  'Contact Method*',
  'Origin City*',
  'Origin State*',
  'Origin Postal Code',
  'Destination City*',
  'Destination State*',
  'Destination Postal Code',
  'Comment',
  'Commodity',
  'Reference ID',
];

// ✅ Constants 
const DEFAULTS = {
  usePrivateNetwork: 'NO',
  useDatLoadboard: 'YES',
  fullPartial: 'Full',
  lengthFt: 53,
};

function fmtDate(d) {
    if (!d) return '';
    try {
        return format(new Date(d), 'MM/dd/yyyy');
    } catch (e) {
        return '';
    }
}

async function handler(req, res) {
  try {
    const { pending, all, days } = req.query;
    
    // FIX: Query 'lanes' table directly to get Rate Randomizer columns and properly formatted dates
    let query = supabaseAdmin
      .from('lanes')
      .select('*')
      .order('created_at', { ascending: false });

    // Optional filter by days
    if (days) {
        const d = new Date();
        d.setDate(d.getDate() - parseInt(days));
        query = query.gte('created_at', d.toISOString());
    }
    
    // Limit to prevent timeouts
    const { data: lanes, error } = await query.limit(2000);
    
    if (error) throw error;
    
    // Generate CSV
    const rows = [];
    console.log('[TRACE] Generating CSV via Simple API with BLANK Ref IDs');
    
    for (const lane of lanes || []) {
       // Calculate Rate - Handle Randomizer
       let rate = '';
       if (lane.randomize_rate && lane.rate_min && lane.rate_max) {
           const min = Number(lane.rate_min);
           const max = Number(lane.rate_max);
           if (!isNaN(min) && !isNaN(max) && max >= min) {
               rate = String(Math.floor(Math.random() * (max - min + 1)) + min);
           }
       } else if (lane.rate) {
           rate = String(lane.rate);
       }
       
       // Calculate Weight - Handle Randomizer
       let weight = lane.weight_lbs || '';
       if (lane.randomize_weight && lane.weight_min && lane.weight_max) {
           const min = Number(lane.weight_min);
           const max = Number(lane.weight_max);
           if (!isNaN(min) && !isNaN(max) && max >= min) {
               weight = Math.floor(Math.random() * (max - min + 1)) + min;
           }
       }

       // Duplicate for Contact Methods
       ['Email', 'Primary Phone'].forEach(contact => {
         const row = [
            fmtDate(lane.pickup_earliest),
            fmtDate(lane.pickup_latest || lane.pickup_earliest),
            lane.length_ft || 53,
            weight,
            lane.full_partial || 'Full',
            lane.equipment_code || 'V',
            'NO', '', '', '', 'YES', 
            rate, // DAT Loadboard Rate generated above
            '', '', 
            contact,
            lane.origin_city, lane.origin_state, '',
            lane.dest_city, lane.dest_state, '',
            lane.comment || '',
            lane.commodity || '',
            '' // Reference ID - FORCE BLANK
         ];
         rows.push(row);
       });
    }

    const csvContent = [
        HEADERS.join(','),
        ...rows.map(r => r.map(c => {
            const val = String(c || '');
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(','))
    ].join('\n');

    // ✅ Headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="DAT_Export_${format(new Date(), 'yyyy-MM-dd')}.csv"`);
    
    // ✅ FORCE CACHE BUSTING
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).send(csvContent);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export default handler;

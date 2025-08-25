// pages/lanes.js
import { useEffect, useState } from 'react';
import CityAutocomplete from '../components/CityAutocomplete.jsx';
import EquipmentPicker from '../components/EquipmentPicker.jsx';
import IntermodalNudge from '../components/IntermodalNudge';
import IntermodalEmailModal from '../components/IntermodalEmailModal';
import { supabase } from '../utils/supabaseClient';
import { checkIntermodalEligibility } from '../lib/intermodalAdvisor';
import Head from 'next/head';

function Section({ title, children, right, className = '' }) {
  return (
    <section className={`bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden ${className}`}>
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
        {right}
      </div>
      <div className="p-4 bg-gray-900">{children}</div>
    </section>
  );
}

export default function LanesPage() {
  // Form state
  const [origin, setOrigin] = useState('');
  const [originZip, setOriginZip] = useState('');
  const [dest, setDest] = useState('');
  const [destZip, setDestZip] = useState('');
  const [equipment, setEquipment] = useState('');
  const [lengthFt, setLengthFt] = useState(48);
  const [fullPartial, setFullPartial] = useState('full');
  const [pickupEarliest, setPickupEarliest] = useState('');
  const [pickupLatest, setPickupLatest] = useState('');
  const [comment, setComment] = useState('');
  const [commodity, setCommodity] = useState('');

  // Weight
  const [randomize, setRandomize] = useState(false);
  const [randMin, setRandMin] = useState('');
  const [randMax, setRandMax] = useState('');
  const [weight, setWeight] = useState('');
  const [randOpen, setRandOpen] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);

  // Lists
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // Intermodal system
  const [showIntermodalNudge, setShowIntermodalNudge] = useState(false);
  const [showIntermodalEmail, setShowIntermodalEmail] = useState(false);
  const [intermodalLane, setIntermodalLane] = useState(null);

  // Edit functionality
  const [editingLane, setEditingLane] = useState(null);

  function onPickOrigin(it){ setOrigin(`${it.city}, ${it.state}`); setOriginZip(it.zip || ''); }
  function onPickDest(it){ setDest(`${it.city}, ${it.state}`); setDestZip(it.zip || ''); }

  async function loadLists(){
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from('lanes').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(200),
      supabase.from('lanes').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setPending(p || []); setRecent(r || []);
  }
  useEffect(()=>{ loadLists(); }, []);

  // When user toggles randomize ON, open modal. Respect session memory
  useEffect(()=>{
    if (randomize) {
      setRandOpen(true);
      const sMin = sessionStorage.getItem('rr_rand_min');
      const sMax = sessionStorage.getItem('rr_rand_max');
      if (sMin && sMax) { setRandMin(sMin); setRandMax(sMax); }
    }
  }, [randomize]);

  function validate(){
    if (!origin.includes(',' ) || !dest.includes(',') ) return 'Choose Origin and Destination from the list.';
    if (!equipment) return 'Equipment is required.';
    if (!lengthFt || Number(lengthFt) <= 0) return 'Length must be > 0.';
    if (!pickupEarliest || !pickupLatest) return 'Pickup dates are required.';
    if (!randomize) {
      if (!weight || Number(weight) <= 0) return 'Weight is required when randomize is OFF.';
    } else {
      const mn = Number(randMin), mx = Number(randMax);
      if (!Number.isFinite(mn) || !Number.isFinite(mx) || mn <= 0 || mx <= 0 || mn > mx) return 'Randomize range invalid.';
    }
    return null;
  }

  async function submitLane(e){
    e.preventDefault(); setMsg('');
    const err = validate(); if (err) { setMsg(err); return; }
    setBusy(true);
    try {
      const [oc, os] = origin.split(',').map(s=>s.trim());
      const [dc, ds] = dest.split(',').map(s=>s.trim());
      const payload = {
        origin_city: oc, origin_state: os, origin_zip: originZip || null,
        dest_city: dc,   dest_state: ds,   dest_zip: destZip || null,
        equipment_code: equipment.toUpperCase(),
        length_ft: Number(lengthFt),
        full_partial: fullPartial === 'partial' ? 'partial' : 'full',
        pickup_earliest: pickupEarliest,
        pickup_latest: pickupLatest,
        randomize_weight: !!randomize,
        weight_lbs: randomize ? null : Number(weight),
        weight_min: randomize ? Number(randMin) : null,
        weight_max: randomize ? Number(randMax) : null,
        comment: comment || null,
        commodity: commodity || null,
        status: 'pending',
      };
      
      // Save weight randomization settings if requested
      if (randomize && rememberSession) {
        sessionStorage.setItem('rr_rand_min', randMin);
        sessionStorage.setItem('rr_rand_max', randMax);
      }
      
      // Use the API endpoint for better validation and error handling
      const response = await fetch('/api/lanes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save lane');
      }

      const newLane = await response.json();
      
      // Check for intermodal eligibility after successful lane creation
      if (newLane.data) {
        const laneData = {
          origin_city: oc,
          origin_state: os,
          dest_city: dc,
          dest_state: ds,
          equipment_code: equipment.toUpperCase(),
          length_ft: Number(lengthFt),
          weight_lbs: randomize ? null : Number(weight)
        };
        
        const isEligible = await checkIntermodalEligibility(laneData);
        if (isEligible.eligible) {
          setIntermodalLane(newLane.data);
          setShowIntermodalNudge(true);
        }
      }

      setMsg('Lane added.');
      setOrigin(''); setOriginZip(''); setDest(''); setDestZip('');
      setComment(''); setCommodity('');
      setWeight(''); setRandomize(false);
      await loadLists();
    } catch (e2) {
      setMsg(e2.message || 'Failed to save lane.');
    } finally { setBusy(false); }
  }

  async function openCrawlPreview(l){
    try {
      const o = `${l.origin_city},${l.origin_state}`;
      const d = `${l.dest_city},${l.dest_state}`;
      
      // Test the API first to make sure it works
      const testUrl = `/api/debugCrawl?origin=${encodeURIComponent(o)}&dest=${encodeURIComponent(d)}&equip=${encodeURIComponent(l.equipment_code)}&fill=0`;
      const response = await fetch(testUrl);
      if (!response.ok) {
        const errorText = await response.text();
        setMsg(`Preview failed: ${response.status} - ${errorText}`);
        return;
      }
      
      // If API works, open formatted preview page
      const previewParams = new URLSearchParams({
        origin: o,
        dest: d,
        equip: l.equipment_code
      });
      
      const previewUrl = `/crawl-preview?${previewParams.toString()}`;
      window.open(previewUrl, '_blank', 'width=1200,height=800,scrollbars=yes');
    } catch (error) {
      console.error('Preview error:', error);
      setMsg(`Preview failed: ${error.message}`);
    }
  }
  
  async function perLaneExport(l, fill=false){
    console.log('Export button clicked:', { lane: l.id, fill });
    setMsg('Starting export...');
    
    try {
      const url = `/api/exportLaneCsv?id=${encodeURIComponent(l.id)}&fill=${fill?'1':'0'}`;
      console.log('Export URL:', url);
      
      // Test the API first
      const response = await fetch(url);
      console.log('API response:', response.status, response.statusText);
      
      // Log debug headers
      const debugPairs = response.headers.get('X-Debug-Pairs');
      const debugRows = response.headers.get('X-Debug-Rows');
      const debugFillTo10 = response.headers.get('X-Debug-FillTo10');
      console.log('FILL-TO-5 DEBUG:', { pairs: debugPairs, rows: debugRows, fillTo10: debugFillTo10 });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export failed:', response.status, errorText);
        setMsg(`Export failed: ${response.status} - ${errorText}`);
        return;
      }
      
      // If successful, trigger download
      console.log('Opening download window...');
      window.open(url, '_blank');
      setMsg('Export successful!');
    } catch (error) {
      console.error('Export error:', error);
      setMsg(`Export failed: ${error.message}`);
    }
  }

  async function check(origin, dest, equip) {
    if (!origin || !dest || !equip) {
      setMsg('Please complete origin, destination and equipment to preview');
      return;
    }
    
    try {
      // Parse origin and destination
      const originParts = origin.split(',');
      const destParts = dest.split(',');
      
      const originFormatted = originParts.length >= 2 ? 
        `${originParts[0].trim()},${originParts[1].trim()}` : origin;
      const destFormatted = destParts.length >= 2 ? 
        `${destParts[0].trim()},${destParts[1].trim()}` : dest;
      
      // Test the API first to make sure it works
      const testParams = new URLSearchParams({
        origin: originFormatted,
        dest: destFormatted,
        equip: equip
      });
      
      const testUrl = `/api/debugCrawl?${testParams.toString()}`;
      const response = await fetch(testUrl);
      if (!response.ok) {
        const errorText = await response.text();
        setMsg(`Preview failed: ${response.status} - ${errorText}`);
        return;
      }
      
      // If API works, open formatted preview page
      const previewParams = new URLSearchParams({
        origin: originFormatted,
        dest: destFormatted,
        equip: equip
      });
      
      const previewUrl = `/crawl-preview?${previewParams.toString()}`;
      window.open(previewUrl, '_blank', 'width=1200,height=800,scrollbars=yes');
    } catch (error) {
      console.error('Preview error:', error);
      setMsg(`Preview failed: ${error.message}`);
    }
  }

  // Emergency client-side CSV generation
  async function emergencyExport() {
    try {
      console.log('🚨 EMERGENCY EXPORT: Starting client-side generation');
      
      // Get lanes data
      const { data: lanes, error } = await supabase
        .from('lanes')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error || !lanes?.length) {
        alert('No pending lanes found');
        return;
      }
      
      console.log(`Emergency: Found ${lanes.length} lanes`);
      
      // Major freight cities
      const freightCities = [
        { city: 'Atlanta', state: 'GA', zip: '30303' },
        { city: 'Chicago', state: 'IL', zip: '60601' },
        { city: 'Dallas', state: 'TX', zip: '75201' },
        { city: 'Los Angeles', state: 'CA', zip: '90001' },
        { city: 'Phoenix', state: 'AZ', zip: '85001' },
        { city: 'Denver', state: 'CO', zip: '80201' },
        { city: 'Miami', state: 'FL', zip: '33101' },
        { city: 'Seattle', state: 'WA', zip: '98101' },
        { city: 'Boston', state: 'MA', zip: '02101' },
        { city: 'Detroit', state: 'MI', zip: '48201' }
      ];
      
      // DAT Headers
      const headers = [
        'Pickup Earliest*', 'Pickup Latest', 'Length (ft)*', 'Weight (lbs)*',
        'Full/Partial*', 'Equipment*', 'Use Private Network*', 'Private Network Rate',
        'Allow Private Network Booking', 'Allow Private Network Bidding',
        'Use DAT Loadboard*', 'DAT Loadboard Rate', 'Allow DAT Loadboard Booking',
        'Use Extended Network', 'Contact Method*', 'Origin City*', 'Origin State*',
        'Origin Postal Code', 'Destination City*', 'Destination State*',
        'Destination Postal Code', 'Comment', 'Commodity', 'Reference ID'
      ];
      
      const csvRows = [headers.join(',')];
      
      // Generate rows for each lane
      for (let i = 0; i < lanes.length; i++) {
        const lane = lanes[i];
        const weight = lane.weight_lbs || 45000;
        
        // Base lane (original cities)
        const baseRow = [
          lane.pickup_earliest, lane.pickup_latest || lane.pickup_earliest,
          lane.length_ft || 48, weight, lane.full_partial || 'full',
          lane.equipment_code || 'FD', 'yes', '', 'no', 'no', 'yes', '', 'no', 'yes'
        ];
        
        // Add base lane rows (email + phone)
        csvRows.push([...baseRow, 'email', lane.origin_city, lane.origin_state, '', lane.dest_city, lane.dest_state, '', lane.comment || '', lane.commodity || '', ''].join(','));
        csvRows.push([...baseRow, 'primary phone', lane.origin_city, lane.origin_state, '', lane.dest_city, lane.dest_state, '', lane.comment || '', lane.commodity || '', ''].join(','));
        
        // Add 5 freight city pairs
        for (let j = 0; j < 5; j++) {
          const originCity = freightCities[(i * 2 + j) % freightCities.length];
          const destCity = freightCities[(i * 2 + j + 5) % freightCities.length];
          
          csvRows.push([...baseRow, 'email', originCity.city, originCity.state, originCity.zip, destCity.city, destCity.state, destCity.zip, lane.comment || '', lane.commodity || '', ''].join(','));
          csvRows.push([...baseRow, 'primary phone', originCity.city, originCity.state, originCity.zip, destCity.city, destCity.state, destCity.zip, lane.comment || '', lane.commodity || '', ''].join(','));
        }
      }
      
      console.log(`Emergency: Generated ${csvRows.length - 1} data rows (expected: ${lanes.length * 12})`);
      
      // Download CSV
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `emergency_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert(`SUCCESS: Generated ${csvRows.length - 1} rows for ${lanes.length} lanes!`);
      
    } catch (error) {
      console.error('Emergency export error:', error);
      alert('Emergency export failed: ' + error.message);
    }
  }

  async function bulkExport({ fill }){
    console.log('Bulk export clicked:', { fill });
    setMsg('Starting bulk export...');
    
    // QUICK CRAWL TEST - Let's see what's happening
    if (fill) {
      try {
        console.log('=== TESTING CRAWL GENERATION ===');
        const testResponse = await fetch(`/api/test-crawl?t=${Date.now()}`); // Cache bust
        const testResult = await testResponse.json();
        console.log('CRAWL TEST RESULT (detailed):', JSON.stringify(testResult, null, 2));
      } catch (e) {
        console.log('Crawl test failed:', e);
      }
    }
    
    try {
      const head = await fetch(`/api/exportDatCsv?pending=1&fill=${fill?'1':'0'}`, { method:'HEAD' });
      console.log('Bulk export HEAD response:', head.status);
      
      if (!head.ok) {
        const errorText = await head.text();
        setMsg(`Bulk export failed: ${head.status} - ${errorText}`);
        return;
      }
      
      const total = Number(head.headers.get('X-Total-Parts') || '1');
      console.log('Total parts to download:', total);
      
      for (let i=1;i<=total;i++){
        const url = `/api/exportDatCsv?pending=1&fill=${fill?'1':'0'}&part=${i}`;
        console.log(`Downloading part ${i}/${total}:`, url);
        
        // First, test the response to see what we're getting
        const testResponse = await fetch(url);
        const csvContent = await testResponse.text();
        const rowCount = csvContent.split('\n').length - 1; // Subtract 1 for header
        
        // Log debug headers
        const debugLanes = testResponse.headers.get('X-Debug-Lanes-Processed');
        const debugTotalRows = testResponse.headers.get('X-Debug-Total-Rows');
        const debugFillMode = testResponse.headers.get('X-Debug-Fill-Mode');
        const debugSelectedRows = testResponse.headers.get('X-Debug-Selected-Rows');
        
        console.log(`BULK EXPORT DEBUG: Part ${i}/${total}`);
        console.log(`  Lanes processed: ${debugLanes}`);
        console.log(`  Total rows generated: ${debugTotalRows}`);
        console.log(`  Fill-to-5 mode: ${debugFillMode}`);
        console.log(`  Selected rows for this part: ${debugSelectedRows}`);
        console.log(`  Actual CSV rows: ${rowCount}`);
        console.log(`  First few lines:`, csvContent.split('\n').slice(0, 3));
        
        // Now trigger the download
        const a = document.createElement('a'); 
        a.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
        a.download = `DAT_Pending_part${i}-of-${total}.csv`;
        document.body.appendChild(a); 
        a.click(); 
        a.remove();
        
        // Slight delay to avoid popup blocking
        if (i < total) await new Promise(r => setTimeout(r, 200));
      }
      setMsg(`Bulk export completed! Downloaded ${total} files.`);
    } catch (e) { 
      console.error('Bulk export error:', e);
      setMsg('Bulk export failed: ' + (e.message || ''));
    }
  }

  async function updateStatus(lane, status){
    try {
      const response = await fetch('/api/lanes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lane.id, status }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
      
      await loadLists();
    } catch (error) {
      alert(error.message);
    }
  }

  // INTELLIGENT FREIGHT REPOSTING - Create new lane based on successful one
  async function postAgain(lane){
    try {
      setMsg('Creating new lane based on successful posting...');
      
      const payload = {
        origin_city: lane.origin_city,
        origin_state: lane.origin_state,
        origin_zip: lane.origin_zip,
        dest_city: lane.dest_city,
        dest_state: lane.dest_state,
        dest_zip: lane.dest_zip,
        equipment_code: lane.equipment_code,
        length_ft: lane.length_ft,
        full_partial: lane.full_partial,
        pickup_earliest: lane.pickup_earliest,
        pickup_latest: lane.pickup_latest,
        randomize_weight: lane.randomize_weight,
        weight_lbs: lane.weight_lbs,
        weight_min: lane.weight_min,
        weight_max: lane.weight_max,
        comment: lane.comment,
        commodity: lane.commodity,
        status: 'pending',
      };
      
      const response = await fetch('/api/lanes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create new lane');
      }
      
      const newLane = await response.json();
      setMsg(`✅ Successfully created new lane: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
      await loadLists();
      
      // Track intelligence: this route was successful before
      try {
        await fetch('/api/lane-performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lane_id: newLane.data.id,
            equipment_code: lane.equipment_code,
            origin_city: lane.origin_city,
            origin_state: lane.origin_state,
            dest_city: lane.dest_city,
            dest_state: lane.dest_state,
            crawl_cities: [],
            intelligence_metadata: {
              repost_of_successful_lane: lane.id,
              original_success_date: lane.updated_at,
              intelligence_level: 'successful_repost'
            }
          })
        });
      } catch (trackingError) {
        console.warn('Failed to track repost intelligence:', trackingError);
        // Don't fail the main operation for tracking
      }
      
    } catch (error) {
      setMsg(`❌ Failed to create new lane: ${error.message}`);
    }
  }
  
  async function delLane(lane){ 
    if (!confirm('Delete this lane?')) return; 
    
    try {
      const response = await fetch(`/api/lanes?id=${lane.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete lane');
      }
      
      await loadLists();
    } catch (error) {
      alert(error.message);
    }
  }

  function startEdit(lane) {
    setEditingLane({ ...lane });
  }

  function cancelEdit() {
    setEditingLane(null);
  }

  async function saveEdit() {
    if (!editingLane) return;
    
    console.log('Saving lane edit...', editingLane);
    
    try {
      const response = await fetch('/api/lanes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingLane.id,
          origin_city: editingLane.origin_city,
          origin_state: editingLane.origin_state,
          origin_zip: editingLane.origin_zip,
          dest_city: editingLane.dest_city,
          dest_state: editingLane.dest_state,
          dest_zip: editingLane.dest_zip,
          equipment_code: editingLane.equipment_code,
          length_ft: editingLane.length_ft,
          weight_lbs: editingLane.weight_lbs,
          randomize_weight: editingLane.randomize_weight,
          weight_min: editingLane.weight_min,
          weight_max: editingLane.weight_max,
          full_partial: editingLane.full_partial,
          pickup_earliest: editingLane.pickup_earliest,
          pickup_latest: editingLane.pickup_latest,
          commodity: editingLane.commodity,
          comment: editingLane.comment
        })
      });
      
      console.log('Save response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Save error:', errorData);
        throw new Error(errorData.error || 'Failed to update lane');
      }

      const result = await response.json();
      console.log('Save successful:', result);

      setMsg('✅ Lane updated successfully');
      setEditingLane(null);
      await loadLists();
    } catch (error) {
      console.error('Save edit error:', error);
      setMsg(`❌ Failed to update lane: ${error.message}`);
    }
  }

  return (
    <>
      <Head>
        <title>Lane Management | RapidRoutes</title>
      </Head>
      
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Lane Management</h1>
          <p className="text-gray-400">Create and manage freight lanes for DAT posting</p>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden mb-8">
          <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-gray-100">New Lane</h2>
            <div className="flex gap-2">
              <button onClick={() => bulkExport({ fill:false })} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">Export DAT CSV</button>
              <button onClick={() => bulkExport({ fill:true })} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition">Export DAT CSV (Fill)</button>
              <button onClick={emergencyExport} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">🚨 EMERGENCY</button>
            </div>
          </div>
          <div className="p-4 bg-gray-900 space-y-4">
        <form onSubmit={submitLane} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CityAutocomplete id="origin" label="Origin (City, ST)" value={origin} onChange={setOrigin} onPick={onPickOrigin} />
          <CityAutocomplete id="dest"   label="Destination (City, ST)" value={dest}   onChange={setDest}   onPick={onPickDest} />
          <EquipmentPicker code={equipment} onChange={setEquipment} />

          <div>
            <label className="block text-sm text-gray-300 mb-1">Full / Partial</label>
            <select value={fullPartial} onChange={(e)=>setFullPartial(e.target.value)} className="inp">
              <option value="full">Full</option><option value="partial">Partial</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Length (ft)</label>
            <input type="number" min={1} value={lengthFt} onChange={(e)=>setLengthFt(e.target.value)} className="inp" />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Pickup Earliest</label>
            <input type="date" value={pickupEarliest} onChange={(e)=>setPickupEarliest(e.target.value)} className="inp" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Pickup Latest</label>
            <input type="date" value={pickupLatest} onChange={(e)=>setPickupLatest(e.target.value)} className="inp" />
          </div>

          {!randomize && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">Weight (lbs)</label>
              <input type="number" min={1} value={weight} onChange={(e)=>setWeight(e.target.value)} className="inp" />
            </div>
          )}
          {randomize && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Random Min (lbs)</label>
                <input type="number" min={1} value={randMin} onChange={(e)=>setRandMin(e.target.value)} className="inp" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Random Max (lbs)</label>
                <input type="number" min={1} value={randMax} onChange={(e)=>setRandMax(e.target.value)} className="inp" />
              </div>
            </div>
          )}

          <div className="col-span-full flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={randomize} onChange={(e)=>setRandomize(e.target.checked)} className="accent-gray-300" />
              Randomize Weight
            </label>
            <button type="button" onClick={()=>setRandOpen(true)} className="btn-secondary">Set Range (Session)</button>
          </div>

          <div className="col-span-full">
            <label className="block text-sm text-gray-300 mb-1">Comment (optional)</label>
            {!comment && <div className="text-xs italic text-gray-400 mb-1">Reminder: DAT auto removes postings with any contact information in comments</div>}
            <input type="text" value={comment} onChange={(e)=>setComment(e.target.value)} className="inp" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Commodity (optional)</label>
            <input type="text" value={commodity} onChange={(e)=>setCommodity(e.target.value)} className="inp" />
          </div>

          {msg && <div className="col-span-full text-sm text-gray-300">{msg}</div>}

          <div className="col-span-full flex items-center gap-4">
            <button type="submit" disabled={busy} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">{busy ? 'Saving…' : 'Add Lane'}</button>
            {!busy && <button type="button" onClick={() => check(origin, dest, equipment)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition">Preview</button>}
          </div>
        </form>
      </div>
    </div>

      <Section
        title="Lanes"
        right={
          <div className="flex gap-2">
            <button className={`px-3 py-1 rounded-md ${tab==='pending' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`} onClick={()=>setTab('pending')}>Pending</button>
            <button className={`px-3 py-1 rounded-md ${tab==='recent' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`} onClick={()=>setTab('recent')}>Recent</button>
          </div>
        }
      >
        <div className="divide-y divide-gray-800">
          {(tab === 'pending' ? pending : recent).map(l => (
            <div key={l.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-3">
              <div className="text-sm">
                <div className="text-gray-100">
                  {l.reference_id && (
                    <span className="inline-block mr-3 px-2 py-0.5 text-xs font-mono font-bold rounded bg-green-900/60 text-green-200">
                      REF #{l.reference_id}
                    </span>
                  )}
                  <span className="font-medium">{l.origin_city}, {l.origin_state}</span>
                  <span className="mx-2 text-gray-500">→</span>
                  <span className="font-medium">{l.dest_city}, {l.dest_state}</span>
                  <span className="ml-2 text-gray-400">[{l.equipment_code} • {l.length_ft}ft]</span>
                </div>
                <div className="text-xs text-gray-400">
                  {l.randomize_weight ? `Weight: ${l.weight_min}-${l.weight_max} lbs` : `Weight: ${l.weight_lbs || '—'} lbs`}
                  <span className="ml-3">Pickup: {l.pickup_earliest} → {l.pickup_latest}</span>
                  {l.comment ? <span className="ml-3">Note: {l.comment}</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={()=>openCrawlPreview(l)} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg">Preview</button>
                <button onClick={()=>perLaneExport(l,false)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">Export</button>
                <button onClick={()=>perLaneExport(l,true)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg">Export (Fill-to-5)</button>
                <button onClick={()=>startEdit(l)} className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg">Edit</button>
                {l.status!=='posted' && <button onClick={()=>updateStatus(l,'posted')} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">Mark Posted</button>}
                {l.status==='posted' && <button onClick={()=>updateStatus(l,'pending')} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg">Unpost</button>}
                {l.status!=='covered' && <button onClick={()=>updateStatus(l,'covered')} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg">Mark Covered</button>}
                {l.status==='covered' && <button onClick={()=>postAgain(l)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg">🚀 Post Again</button>}
                <button onClick={()=>delLane(l)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg">Delete</button>
              </div>
            </div>
          ))}
          {(tab === 'pending' ? pending : recent).length === 0 && (
            <div className="py-6 text-sm text-gray-400">No lanes yet.</div>
          )}
        </div>
      </Section>

      {/* Randomize modal */}
      {randOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-[#0f1115] p-4">
            <h3 className="text-gray-100 font-semibold mb-2">Weight Randomization</h3>
            <p className="text-sm text-gray-400 mb-3">Set a min/max. You can also remember this for all new lanes (this session).</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Min (lbs)</label>
                <input type="number" min={1} value={randMin} onChange={(e)=>setRandMin(e.target.value)} className="inp" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Max (lbs)</label>
                <input type="number" min={1} value={randMax} onChange={(e)=>setRandMax(e.target.value)} className="inp" />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-300 mt-3">
              <input type="checkbox" checked={rememberSession} onChange={(e)=>setRememberSession(e.target.checked)} className="accent-gray-300" />
              Apply to all new lanes (this session)
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" onClick={()=>setRandOpen(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={()=>{
                  if (rememberSession){ sessionStorage.setItem('rr_rand_min', String(randMin||'')); sessionStorage.setItem('rr_rand_max', String(randMax||'')); }
                  setRandOpen(false);
                }}
              >Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Intermodal Nudge Modal */}
      {showIntermodalNudge && (
        <IntermodalNudge
          lane={intermodalLane}
          onClose={() => setShowIntermodalNudge(false)}
          onEmail={(lane) => {
            setShowIntermodalNudge(false);
            setShowIntermodalEmail(true);
          }}
        />
      )}

      {/* Intermodal Email Modal */}
      {showIntermodalEmail && (
        <IntermodalEmailModal
          lane={intermodalLane}
          onClose={() => setShowIntermodalEmail(false)}
        />
      )}

      {/* Edit Lane Modal */}
      {editingLane && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-700 bg-[#0f1115] p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-gray-100 font-semibold mb-4">Edit Lane</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Origin City, State</label>
                <input 
                  value={`${editingLane.origin_city}, ${editingLane.origin_state}`}
                  onChange={(e) => {
                    const [city, state] = e.target.value.split(',').map(s => s.trim());
                    setEditingLane({...editingLane, origin_city: city || '', origin_state: state || ''});
                  }}
                  className="inp" 
                  placeholder="City, State"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Origin ZIP</label>
                <input 
                  value={editingLane.origin_zip || ''}
                  onChange={(e) => setEditingLane({...editingLane, origin_zip: e.target.value})}
                  className="inp" 
                  placeholder="ZIP code"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Destination City, State</label>
                <input 
                  value={`${editingLane.dest_city}, ${editingLane.dest_state}`}
                  onChange={(e) => {
                    const [city, state] = e.target.value.split(',').map(s => s.trim());
                    setEditingLane({...editingLane, dest_city: city || '', dest_state: state || ''});
                  }}
                  className="inp" 
                  placeholder="City, State"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Destination ZIP</label>
                <input 
                  value={editingLane.dest_zip || ''}
                  onChange={(e) => setEditingLane({...editingLane, dest_zip: e.target.value})}
                  className="inp" 
                  placeholder="ZIP code"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <EquipmentPicker 
                  label="Equipment Code"
                  code={editingLane.equipment_code || ''}
                  onChange={(code) => setEditingLane({...editingLane, equipment_code: code})}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Length (ft)</label>
                <input 
                  type="number"
                  value={editingLane.length_ft || 48}
                  onChange={(e) => setEditingLane({...editingLane, length_ft: parseInt(e.target.value) || 48})}
                  className="inp"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Weight (lbs)</label>
                <input 
                  type="number"
                  value={editingLane.weight_lbs || ''}
                  onChange={(e) => setEditingLane({...editingLane, weight_lbs: parseInt(e.target.value) || null})}
                  className="inp"
                  placeholder="Weight in pounds"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Pickup Earliest</label>
                <input 
                  type="date"
                  value={editingLane.pickup_earliest || ''}
                  onChange={(e) => setEditingLane({...editingLane, pickup_earliest: e.target.value})}
                  className="inp"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Pickup Latest</label>
                <input 
                  type="date"
                  value={editingLane.pickup_latest || ''}
                  onChange={(e) => setEditingLane({...editingLane, pickup_latest: e.target.value})}
                  className="inp"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Commodity</label>
                <input 
                  value={editingLane.commodity || ''}
                  onChange={(e) => setEditingLane({...editingLane, commodity: e.target.value})}
                  className="inp"
                  placeholder="What you're shipping"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Full/Partial</label>
                <select 
                  value={editingLane.full_partial || 'full'}
                  onChange={(e) => setEditingLane({...editingLane, full_partial: e.target.value})}
                  className="inp"
                >
                  <option value="full">Full Load</option>
                  <option value="partial">Partial Load</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-1">Comments</label>
              <textarea 
                value={editingLane.comment || ''}
                onChange={(e) => setEditingLane({...editingLane, comment: e.target.value})}
                className="inp"
                rows={3}
                placeholder="Additional notes or requirements"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={cancelEdit} className="btn-secondary">Cancel</button>
              <button onClick={saveEdit} className="btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .inp { @apply w-full rounded-lg bg-[#0b0d12] border border-gray-700 px-3 py-2 text-gray-100 outline-none focus:border-gray-500; }
        .btn-primary { @apply rounded-lg bg-gray-100 text-black font-medium px-4 py-2 hover:bg-white disabled:opacity-60; }
        .btn-secondary { @apply rounded-lg border border-gray-700 px-3 py-1.5 text-gray-200 hover:bg-gray-800; }
        .btn-danger { @apply rounded-lg border border-red-700 px-3 py-1.5 text-red-300 hover:bg-red-900/30; }
        .tab { @apply rounded-lg border border-gray-700 px-3 py-1.5 text-gray-300 hover:text-white; }
        .tab-active { @apply bg-gray-800 text-white; }
      `}</style>
    </div>
    </>
  );
}

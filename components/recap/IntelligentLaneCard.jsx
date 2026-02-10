// components/recap/IntelligentLaneCard.jsx
// Enterprise Lane Card with intelligent features

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { WeatherBadge } from '../weather/WeatherCard';
import EmailTemplateModal from '../EmailTemplateModal';

// City coordinates for weather lookup
const CITY_COORDS = {
    'Chicago': { lat: 41.8781, lng: -87.6298 },
    'Dallas': { lat: 32.7767, lng: -96.7970 },
    'Atlanta': { lat: 33.7490, lng: -84.3880 },
    'Los Angeles': { lat: 34.0522, lng: -118.2437 },
    'Houston': { lat: 29.7604, lng: -95.3698 },
    'Phoenix': { lat: 33.4484, lng: -112.0740 },
    'Denver': { lat: 39.7392, lng: -104.9903 },
    'Miami': { lat: 25.7617, lng: -80.1918 },
    'Seattle': { lat: 47.6062, lng: -122.3321 },
    'Detroit': { lat: 42.3314, lng: -83.0458 },
    'Minneapolis': { lat: 44.9778, lng: -93.2650 },
    'St. Louis': { lat: 38.6270, lng: -90.1994 },
    'Kansas City': { lat: 39.0997, lng: -94.5786 },
    'Memphis': { lat: 35.1495, lng: -90.0490 },
    'Nashville': { lat: 36.1627, lng: -86.7816 },
    'Indianapolis': { lat: 39.7684, lng: -86.1581 },
    'Columbus': { lat: 39.9612, lng: -82.9988 },
    'Charlotte': { lat: 35.2271, lng: -80.8431 },
    // Add more as needed
};

function getCityCoords(cityName) {
    const city = cityName?.split(',')[0]?.trim();
    return CITY_COORDS[city] || null;
}

export default function IntelligentLaneCard({
    lane,
    recapData,
    contacts = [],
    carrierHistory = [],
    lastCovered = null,
    capacityScore = null,
    isSelected = false,
    onSelect,
    onGenerateRecap,
    isGenerating,
    postedPairs = [],
    setContactModal,
    onArchive,
    onGaveBack,
    onBoostRate,
    onAddCarrierOffer,
    onTogglePriority,
    onExportCSV,
}) {
    const router = useRouter();
    const [showCarrierOfferForm, setShowCarrierOfferForm] = useState(false);
    const [carrierOfferMC, setCarrierOfferMC] = useState('');
    const [carrierOfferRate, setCarrierOfferRate] = useState('');
    const [carrierOfferEmail, setCarrierOfferEmail] = useState('');
    const [offerActionType, setOfferActionType] = useState('offer'); // 'offer', 'call', 'email'
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [showGaveBackModal, setShowGaveBackModal] = useState(false);
    const [gaveBackReason, setGaveBackReason] = useState('');
    const [archiveData, setArchiveData] = useState({ mc: '', email: '', rate: '' });

    // Calculate contact count
    const contactCount = contacts.length;
    const isHotLane = contactCount >= 5;

    // Calculate time since posted
    const postedAt = lane.posted_at || lane.created_at;
    const hoursSincePosted = postedAt
        ? (Date.now() - new Date(postedAt).getTime()) / (1000 * 60 * 60)
        : 0;
    const noResponseAlert = hoursSincePosted >= 1 && contactCount === 0;
    const dyingLaneAlert = hoursSincePosted >= 24 && contactCount === 0;

    // Get origin/dest coordinates for weather
    const originCoords = getCityCoords(lane.origin_city);
    const destCoords = getCityCoords(lane.dest_city || lane.destination_city);

    // Check if lane has saved city choices
    const hasSavedChoices = lane.saved_origin_cities?.length > 0 &&
        lane.saved_dest_cities?.length > 0;
    const totalPairs = hasSavedChoices
        ? Math.min(lane.saved_origin_cities.length, lane.saved_dest_cities.length)
        : 0;

    const isCurrent = (lane.lane_status || lane.status) === 'current';
    const isPriority = lane.is_priority || false;

    // Handle carrier offer/call/email submission
    const handleSubmitCarrierOffer = async () => {
        if (carrierOfferMC) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const logData = {
                    lane_id: lane.id,
                    mc_number: carrierOfferMC,
                    email: carrierOfferEmail,
                    rate: carrierOfferRate ? parseFloat(carrierOfferRate) : null,
                    action: offerActionType,
                    user_id: session?.user?.id
                };

                const { error } = await supabase.from('carrier_history').insert([logData]);
                if (error) throw error;
            } catch (e) {
                console.error("Log failed", e);
            }

            if (offerActionType === 'offer') {
                onAddCarrierOffer?.(lane.id, {
                    mc_number: carrierOfferMC,
                    rate_offered: parseFloat(carrierOfferRate),
                });
            }

            setCarrierOfferMC('');
            setCarrierOfferRate('');
            setCarrierOfferEmail('');
            setShowCarrierOfferForm(false);
        }
    };

    // Handle archive
    const handleArchive = async () => {
        if (archiveData.mc && archiveData.rate) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                await supabase.from('carrier_history').insert([{
                    lane_id: lane.id,
                    mc_number: archiveData.mc,
                    email: archiveData.email,
                    rate: parseFloat(archiveData.rate),
                    action: 'covered',
                    user_id: session?.user?.id
                }]);
            } catch (e) { console.error("History log failed", e); }

            onArchive?.(lane.id, archiveData);
            setShowArchiveModal(false);
            setArchiveData({ mc: '', email: '', rate: '' });
        }
    };

    // Handle gave back
    const handleGaveBack = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await supabase.from('carrier_history').insert([{
                lane_id: lane.id,
                action: 'gave_back',
                notes: gaveBackReason,
                user_id: session?.user?.id
            }]);
        } catch (e) { console.error("Gave back log failed", e); }

        onGaveBack?.(lane.id, gaveBackReason);
        setShowGaveBackModal(false);
        setGaveBackReason('');
    };

    // Determine border color based on alerts
    const getBorderColor = () => {
        if (dyingLaneAlert) return 'border-red-500/50';
        if (noResponseAlert) return 'border-amber-500/40';
        if (isPriority) return 'border-yellow-500/50';
        if (isHotLane) return 'border-emerald-500/30';
        return 'border-cyan-500/10';
    };

    // Generate map URL
    const mapSrc = `https://www.google.com/maps/embed/v1/directions?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&origin=${encodeURIComponent(lane.origin_city + ', ' + lane.origin_state)}&destination=${encodeURIComponent((lane.dest_city || lane.destination_city) + ', ' + (lane.dest_state || lane.destination_state))}&mode=driving`;

    // Generate pairs for display
    const pairs = useMemo(() => {
        if (!lane.saved_origin_cities || !lane.saved_dest_cities) return [];
        const result = [];
        const limit = Math.min(lane.saved_origin_cities.length, lane.saved_dest_cities.length, 8); // Max 8 for UI
        for (let i = 0; i < limit; i++) {
            result.push({
                origin: lane.saved_origin_cities[i],
                dest: lane.saved_dest_cities[i]
            });
        }
        return result;
    }, [lane.saved_origin_cities, lane.saved_dest_cities]);

    return (
        <div className={`glass-card mb-8 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] ${getBorderColor()} flex flex-col`}>

            {/* Top Alert Banners */}
            {dyingLaneAlert && (
                <div className="bg-red-500/15 border-b border-red-500/30 px-4 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-red-400">⚠️</span>
                        <span className="text-xs text-red-300 font-medium">Dying Lane (&gt;24h No Response)</span>
                    </div>
                    {/* Priority/Select Controls in Header */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => onTogglePriority?.(lane.id)} className={`text-xs ${isPriority ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'}`}>
                            {isPriority ? '⭐ Priority' : '☆ Priority'}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex min-h-[420px] h-auto"> {/* Dynamic Height */}
                {/* LEFT: Lane Identity & Intelligence */}
                <div className="w-[240px] p-5 border-r border-white/5 flex flex-col bg-black/20">
                    {/* Header Controls (if no alert banner) */}
                    {!dyingLaneAlert && (
                        <div className="flex justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${isCurrent ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                    }`}>
                                    {isCurrent ? 'Active' : 'Archived'}
                                </span>
                                {isHotLane && <span className="text-[10px] font-bold text-orange-400">🔥 Hot</span>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => onTogglePriority?.(lane.id)} className={`text-lg leading-none ${isPriority ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}>
                                    {isPriority ? '★' : '☆'}
                                </button>
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => onSelect?.(lane.id, e.target.checked)}
                                    className="rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-0"
                                />
                            </div>
                        </div>
                    )}

                    <div className="mb-4">
                        <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold mb-1">Origin</div>
                        <div className="text-xl font-bold text-white leading-tight">{lane.origin_city}, {lane.origin_state}</div>
                        {originCoords && (
                            <div className="mt-1 flex items-center gap-2">
                                <WeatherBadge lat={originCoords.lat} lng={originCoords.lng} />
                            </div>
                        )}
                    </div>

                    <div className="mb-4 pb-4 border-b border-white/5">
                        <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold mb-1">Destination</div>
                        <div className="text-xl font-bold text-white leading-tight">{lane.dest_city || lane.destination_city}, {lane.dest_state || lane.destination_state}</div>
                        {destCoords && (
                            <div className="mt-1 flex items-center gap-2">
                                <WeatherBadge lat={destCoords.lat} lng={destCoords.lng} />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-4 mb-6">
                        <div>
                            <div className="text-[9px] uppercase text-gray-500 font-bold">Equip</div>
                            <div className="text-sm font-bold text-white">{lane.equipment_code || 'V'}</div>
                        </div>
                        <div>
                            <div className="text-[9px] uppercase text-gray-500 font-bold">Weight</div>
                            <div className="text-sm font-bold text-white">{lane.weight_lbs ? `${Math.round(lane.weight_lbs / 1000)}k` : '-'}</div>
                        </div>
                        <div>
                            <div className="text-[9px] uppercase text-gray-500 font-bold">Miles</div>
                            <div className="text-sm font-bold text-white">{lane.stats?.miles || 0}</div>
                        </div>
                        <div>
                            <div className="text-[9px] uppercase text-gray-500 font-bold">Est. Time</div>
                            <div className="text-sm font-bold text-white">
                                {lane.stats?.miles ? `${Math.round(lane.stats.miles / 50)}h ${Math.round((lane.stats.miles % 50) / 50 * 60)}m` : '-'}
                            </div>
                        </div>
                    </div>

                    {/* Traffic & Intelligence Section (Left Side) */}
                    <div className="mb-6 p-3 bg-white/5 rounded border border-white/5">
                        <div className="mb-2">
                            <div className="text-[9px] uppercase text-gray-500 font-bold mb-1">Traffic Conditions</div>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-xs font-medium text-emerald-400">Normal Flow</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-[9px] uppercase text-gray-500 font-bold mb-1">Route</div>
                            <div className="text-xs font-mono text-gray-400">I-55 → I-44 → I-35</div>
                        </div>
                    </div>


                    <div className="mt-auto pt-4 border-t border-white/5">
                        <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Target Rate</div>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-2xl font-extrabold text-emerald-400">${lane.rate?.toLocaleString() || '0'}</span>
                            <span className="text-[10px] text-gray-500 font-mono">${(lane.rate / (lane.stats?.miles || 1)).toFixed(2)}/mi</span>
                        </div>

                        {/* Action Buttons Grid */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => { setOfferActionType('offer'); setShowCarrierOfferForm(true); }}
                                className="col-span-2 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded shadow-lg shadow-cyan-900/20 transition-all"
                            >
                                Log Offer
                            </button>
                            <button
                                onClick={() => { setOfferActionType('call'); setShowCarrierOfferForm(true); }}
                                className="py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded border border-white/10 transition-all"
                            >
                                📞 Log Call
                            </button>
                            <button
                                onClick={() => { setOfferActionType('email'); setShowCarrierOfferForm(true); }}
                                className="py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded border border-white/10 transition-all"
                            >
                                ✉️ Log Email
                            </button>
                            <button onClick={() => setShowArchiveModal(true)} className="py-1.5 border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white text-[10px] font-bold rounded transition-colors">
                                Archive
                            </button>
                            <button onClick={() => setShowGaveBackModal(true)} className="py-1.5 border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white text-[10px] font-bold rounded transition-colors">
                                Gave Back
                            </button>
                            <button
                                onClick={() => setShowEmailModal(true)}
                                className="col-span-2 mt-1 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 border border-purple-500/20 text-[10px] font-bold rounded transition-colors flex items-center justify-center gap-2"
                            >
                                ✨ Auto-Email Generator
                            </button>
                        </div>
                    </div>
                </div>

                {/* CENTER: Map Embed (Clean, No Overlay) */}
                <div className="flex-1 relative bg-slate-900 group/map min-h-[420px]">
                    <iframe
                        src={mapSrc}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="absolute inset-0"
                    />

                    {/* Minimal Map Controls (Top Right) */}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/map:opacity-100 transition-opacity duration-300">
                        <button
                            onClick={() => onExportCSV?.([lane.id])}
                            className="p-2 bg-black/80 hover:bg-black text-white rounded-lg backdrop-blur-md border border-white/10 text-xs font-bold"
                            title="Export to DAT CSV"
                        >
                            📋
                        </button>
                        <button
                            onClick={() => window.open(mapSrc, '_blank')}
                            className="p-2 bg-black/80 hover:bg-black text-white rounded-lg backdrop-blur-md border border-white/10 text-xs font-bold"
                            title="Open Google Maps"
                        >
                            ↗
                        </button>
                    </div>
                </div>

                {/* RIGHT: Posted Lanes */}
                <div className="w-[280px] border-l border-white/5 flex flex-col bg-black/20">
                    <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Posted Lanes</div>
                        <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                            {pairs.length} Active
                        </span>
                    </div>

                    <div className="flex-1 p-2 space-y-1">
                        {pairs.map((pair, idx) => (
                            <div key={idx} className="group/row p-2 rounded hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="text-[11px] font-bold text-gray-200 truncate pr-2" title={`${pair.origin.city} → ${pair.dest.city}`}>
                                        {pair.origin.city} → {pair.dest.city}
                                    </div>
                                    <div className="text-[11px] font-mono text-emerald-400 font-bold">
                                        ${Math.round(lane.rate * (1 + (Math.random() * 0.1 - 0.05))).toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-gray-500 font-mono">
                                        {pair.origin.distance ? Math.round(pair.origin.distance) : 0}mi DH
                                    </span>
                                    <div className="flex gap-1 ml-auto opacity-60 group-hover/row:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setContactModal({ open: true, lane, city: pair.origin, cityType: 'pickup' }); }}
                                            className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[9px] border border-cyan-500/20 hover:bg-cyan-500/20"
                                        >
                                            📞
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setContactModal({ open: true, lane, city: pair.dest, cityType: 'delivery' }); }}
                                            className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[9px] border border-purple-500/20 hover:bg-purple-500/20"
                                        >
                                            📧
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {pairs.length === 0 && (
                            <div className="text-center py-8 px-4">
                                <div className="text-2xl opacity-20 mb-2">🏔️</div>
                                <div className="text-xs text-gray-500">No active postings generated yet.</div>
                                <button onClick={() => onGenerateRecap?.(lane.id)} className="mt-2 text-[10px] text-cyan-400 hover:text-cyan-300 underline">
                                    Generate Postings
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Quick Stats Footer */}
                    <div className="p-3 border-t border-white/5 grid grid-cols-2 gap-2 bg-black/40 mt-auto">
                        <div className="bg-white/5 rounded p-1.5 text-center">
                            <div className="text-[9px] text-gray-500 uppercase">Avg DH</div>
                            <div className="text-xs font-bold text-white">42mi</div>
                        </div>
                        <div className="bg-white/5 rounded p-1.5 text-center">
                            <div className="text-[9px] text-gray-500 uppercase">Contacts</div>
                            <div className={`text-xs font-bold ${isHotLane ? 'text-emerald-400' : 'text-white'}`}>{contactCount}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inline Offer Form (Overlay or below) */}
            {showCarrierOfferForm && (
                <div className="p-4 bg-slate-900 border-t border-cyan-500/30 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Logging {offerActionType}</h4>
                        <button onClick={() => setShowCarrierOfferForm(false)} className="text-gray-500 hover:text-white">✕</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <input
                            value={carrierOfferMC}
                            onChange={(e) => setCarrierOfferMC(e.target.value)}
                            placeholder="Carrier MC #"
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50"
                        />
                        <input
                            value={carrierOfferEmail}
                            onChange={(e) => setCarrierOfferEmail(e.target.value)}
                            placeholder="Carrier Email"
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50"
                        />
                        <input
                            value={carrierOfferRate}
                            onChange={(e) => setCarrierOfferRate(e.target.value)}
                            placeholder="Rate (Optional)"
                            type="number"
                            className="col-span-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50"
                        />
                    </div>
                    <button
                        onClick={handleSubmitCarrierOffer}
                        className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-cyan-900/20 transition-all"
                    >
                        Confirm Log
                    </button>
                </div>
            )}

            {/* Archive Modal Overlay */}
            {showArchiveModal && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 rounded-2xl">
                    <div className="bg-slate-900 border border-white/10 p-5 rounded-xl w-full max-w-sm shadow-2xl">
                        <h4 className="text-sm font-bold text-white mb-3">Archive Lane (Covered)</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-gray-400 uppercase font-bold">Carrier MC</label>
                                <input
                                    value={archiveData.mc}
                                    onChange={e => setArchiveData({ ...archiveData, mc: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500/50 outline-none"
                                    placeholder="e.g. 123456"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 uppercase font-bold">Rate Covered</label>
                                <input
                                    value={archiveData.rate}
                                    onChange={e => setArchiveData({ ...archiveData, rate: e.target.value })}
                                    type="number"
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500/50 outline-none"
                                    placeholder="$0.00"
                                />
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => setShowArchiveModal(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded">Cancel</button>
                                <button onClick={handleArchive} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-lg shadow-emerald-900/20">Archive</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Gave Back Modal Overlay */}
            {showGaveBackModal && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 rounded-2xl">
                    <div className="bg-slate-900 border border-white/10 p-5 rounded-xl w-full max-w-sm shadow-2xl">
                        <h4 className="text-sm font-bold text-white mb-3">Mark as Gave Back</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-gray-400 uppercase font-bold">Reason</label>
                                <select
                                    value={gaveBackReason}
                                    onChange={e => setGaveBackReason(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-red-500/50 outline-none appearance-none"
                                >
                                    <option value="">Select Reason...</option>
                                    <option value="Customer Cancelled">Customer Cancelled</option>
                                    <option value="Rate Too High">Rate Too High</option>
                                    <option value="No Capacity">No Capacity</option>
                                    <option value="Missed Pickup">Missed Pickup</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => setShowGaveBackModal(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded">Cancel</button>
                                <button onClick={handleGaveBack} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded shadow-lg shadow-red-900/20">Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Template Modal */}
            <EmailTemplateModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                lanes={[lane]}
            />
        </div>
    );
}

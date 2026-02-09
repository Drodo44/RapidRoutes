import React, { useState } from 'react';
import { distanceInMiles } from '../utils/haversine';
import { generateOptions } from './post-options/OptionsGenerator'; // Import Generator
import OptionsDisplay from './post-options/OptionsDisplay'; // Import Display

export default function LaneCard({ lane, onEdit, onDelete, onArchive, onRestore, onViewRoute, onPost, isArchived }) {
  const [isPosting, setIsPosting] = useState(false);
  const [postOptions, setPostOptions] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Format dates gracefully
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate estimated RPM
  const calculateRPM = () => {
    try {
      if (!lane.rate || lane.rate <= 0) return null;
      if (lane.origin_latitude && lane.origin_longitude && lane.dest_latitude && lane.dest_longitude) {
        const dist = distanceInMiles(
          { lat: lane.origin_latitude, lon: lane.origin_longitude },
          { lat: lane.dest_latitude, lon: lane.dest_longitude }
        );
        const estRoadDist = dist * 1.2;
        if (estRoadDist > 0) return (lane.rate / estRoadDist).toFixed(2);
      }
    } catch (e) { return null; }
    return null;
  };

  const estRPM = calculateRPM();

  const handlePostClick = async (e) => {
    e.stopPropagation();
    if (isPosting) {
      setIsPosting(false);
      return;
    }

    setLoadingOptions(true);
    try {
      await generateOptions(lane, (data) => {
        setPostOptions(data);
        setIsPosting(true);
        setLoadingOptions(false);
      }, (err) => {
        console.error(err);
        setLoadingOptions(false);
        // Fallback to simpler post if options fail
        onPost(lane);
      });
    } catch (error) {
      console.error("Post error", error);
      setLoadingOptions(false);
    }
  };

  return (
    <div
      className={`group relative transition-all duration-300 ${isPosting ? 'row-span-2 col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-3 z-50' : 'hover:-translate-y-1'}`}
      style={{
        background: 'linear-gradient(135deg, rgba(20, 28, 40, 0.95) 0%, rgba(15, 20, 30, 0.9) 100%)',
        backdropFilter: 'blur(24px)',
        border: isPosting ? '1px solid rgba(6, 182, 212, 0.5)' : '1px solid rgba(56, 189, 248, 0.1)',
        borderTop: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '16px',
        boxShadow: isPosting ? '0 20px 50px rgba(0,0,0,0.5)' : '0 4px 24px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}
    >
      {/* Top Glow Accent */}
      <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent transition-opacity ${isPosting ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`} />

      {/* Content Container */}
      <div className="p-5">

        {/* Header: Route Visual */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-lg font-bold text-white tracking-tight drop-shadow-md">
                {lane.origin_city}, {lane.origin_state}
              </span>
              <span className="text-cyan-400 text-xl">→</span>
              <span className="text-lg font-bold text-white tracking-tight drop-shadow-md">
                {lane.dest_city || lane.destination_city}, {lane.dest_state || lane.destination_state}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                {lane.equipment_code}
              </span>
              <span className="text-xs text-secondary font-medium">{lane.length_ft}ft</span>
              {lane.full_partial === 'partial' && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                  Partial
                </span>
              )}
            </div>
          </div>
          {/* Smart Status Indicator */}
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Active" />
            {lane.rate > 0 && <div className="w-2 h-2 rounded-full bg-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.5)]" title="Rated" />}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5 p-3 rounded-lg bg-black/20 border border-white/5">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-secondary font-semibold mb-1">Pickup Date</div>
            <div className="text-sm font-medium text-white flex items-center gap-2">
              <span className="text-cyan-400/70">📅</span>
              {formatDate(lane.pickup_earliest)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-secondary font-semibold mb-1">Target Rate</div>
            <div className="text-lg font-bold text-emerald-400 leading-none">
              {lane.rate > 0 ? `$${lane.rate.toLocaleString()}` : <span className="text-sm text-secondary italic font-normal">Open</span>}
            </div>
            {estRPM && (
              <div className="text-[10px] text-secondary mt-0.5">
                ${estRPM}/mi (est)
              </div>
            )}
          </div>
          <div className="col-span-2 pt-2 border-t border-white/5 flex justify-between items-center">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-secondary font-semibold">Weight</div>
              <div className="text-sm font-medium text-white">{lane.weight_lbs ? `${(lane.weight_lbs / 1000).toFixed(0)}k lbs` : '—'}</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onViewRoute(lane); }}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
            >
              View Map 🗺️
            </button>
          </div>
        </div>

        {/* Post Options Panel (Inline) */}
        {isPosting && postOptions && (
          <div className="mb-5 animate-in fade-in zoom-in duration-300 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Post Configuration</h4>
              <button onClick={() => setIsPosting(false)} className="text-xs text-secondary hover:text-white">Close</button>
            </div>
            <div className="bg-black/30 rounded-xl p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              <OptionsDisplay
                laneId={lane.id}
                lane={lane}
                originOptions={postOptions.originOptions || []}
                destOptions={postOptions.destOptions || []}
              />
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center gap-2 pt-2">
          {isArchived ? (
            <button
              onClick={(e) => { e.stopPropagation(); onRestore(lane); }}
              className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all"
            >
              Restore Lane
            </button>
          ) : (
            <>
              <button
                onClick={handlePostClick}
                disabled={loadingOptions}
                className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-cyan-900/40 border border-cyan-400/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loadingOptions ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <>
                    <span className="text-sm">🚀</span> {isPosting ? 'Configure Post' : 'Post / Options'}
                  </>
                )}
              </button>

              <div className="flex gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(lane); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-secondary hover:text-white border border-white/5 transition-colors"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onArchive(lane); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-secondary hover:text-white border border-white/5 transition-colors"
                  title="Archive"
                >
                  📦
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(lane); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/10 transition-colors"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

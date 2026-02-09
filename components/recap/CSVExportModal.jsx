// components/recap/CSVExportModal.jsx
// DAT Bulk Upload CSV Export Modal with lane selection

import { useState, useMemo } from 'react';

export default function CSVExportModal({
    isOpen,
    onClose,
    lanes = [],
    selectedLaneIds = [],
    onExport
}) {
    const [contactMethod, setContactMethod] = useState('both'); // 'email', 'phone', 'both'
    const [localSelectedIds, setLocalSelectedIds] = useState(selectedLaneIds);

    // Update local selection when prop changes
    useMemo(() => {
        if (selectedLaneIds.length > 0) {
            setLocalSelectedIds(selectedLaneIds);
        }
    }, [selectedLaneIds]);

    const lanesToExport = useMemo(() => {
        if (localSelectedIds.length > 0) {
            return lanes.filter(l => localSelectedIds.includes(l.id));
        }
        return lanes;
    }, [lanes, localSelectedIds]);

    const toggleLane = (laneId) => {
        setLocalSelectedIds(prev =>
            prev.includes(laneId)
                ? prev.filter(id => id !== laneId)
                : [...prev, laneId]
        );
    };

    const selectAll = () => {
        setLocalSelectedIds(lanes.map(l => l.id));
    };

    const selectNone = () => {
        setLocalSelectedIds([]);
    };

    const handleExport = () => {
        onExport?.(localSelectedIds.length > 0 ? localSelectedIds : lanes.map(l => l.id), contactMethod);
        onClose();
    };

    // Calculate total postings
    const totalPostings = useMemo(() => {
        return lanesToExport.reduce((total, lane) => {
            const pairs = Math.min(
                lane.saved_origin_cities?.length || 0,
                lane.saved_dest_cities?.length || 0
            );
            // Each pair = 2 postings (email + phone) or 1 if single method
            const multiplier = contactMethod === 'both' ? 2 : 1;
            return total + (pairs * multiplier);
        }, 0);
    }, [lanesToExport, contactMethod]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div
                className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
                style={{
                    boxShadow: '0 0 50px rgba(6, 182, 212, 0.1)',
                }}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">Generate DAT Bulk Upload CSV</h2>
                            <p className="text-sm text-gray-400 mt-1">Select lanes and contact method for export</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Contact Method Selection */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">
                            Contact Method
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setContactMethod('email')}
                                className={`flex-1 py-3 rounded-lg border text-sm font-bold transition-all ${contactMethod === 'email'
                                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                📧 Email Only
                            </button>
                            <button
                                onClick={() => setContactMethod('phone')}
                                className={`flex-1 py-3 rounded-lg border text-sm font-bold transition-all ${contactMethod === 'phone'
                                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                📞 Phone Only
                            </button>
                            <button
                                onClick={() => setContactMethod('both')}
                                className={`flex-1 py-3 rounded-lg border text-sm font-bold transition-all ${contactMethod === 'both'
                                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                📧📞 Email + Phone
                            </button>
                        </div>
                    </div>

                    {/* Lane Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                                Select Lanes ({localSelectedIds.length} of {lanes.length} selected)
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={selectAll}
                                    className="text-xs text-cyan-400 hover:text-cyan-300"
                                >
                                    Select All
                                </button>
                                <span className="text-gray-600">|</span>
                                <button
                                    onClick={selectNone}
                                    className="text-xs text-gray-400 hover:text-gray-300"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {lanes.map(lane => {
                                const isSelected = localSelectedIds.includes(lane.id);
                                const pairs = Math.min(
                                    lane.saved_origin_cities?.length || 0,
                                    lane.saved_dest_cities?.length || 0
                                );

                                return (
                                    <div
                                        key={lane.id}
                                        onClick={() => toggleLane(lane.id)}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all ${isSelected
                                                ? 'bg-cyan-500/10 border-cyan-500/30'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => { }}
                                                className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500"
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium text-white text-sm">
                                                    {lane.origin_city}, {lane.origin_state} → {lane.dest_city || lane.destination_city}, {lane.dest_state || lane.destination_state}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    {lane.reference_id || lane.id?.slice(0, 8)} • {pairs} pairs • {lane.equipment_code}
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {pairs * (contactMethod === 'both' ? 2 : 1)} postings
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-black/30">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                            <span className="text-white font-bold">{totalPostings}</span> total postings will be exported
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={lanesToExport.length === 0}
                                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                📥 Generate CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

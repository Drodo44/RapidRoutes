import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { rrNumberSystem } from '../lib/RRNumberSystem';

export function RecapView({ laneId }) {
    const [recap, setRecap] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPosting, setSelectedPosting] = useState(null);
    const [searchRR, setSearchRR] = useState('');
    
    useEffect(() => {
        fetchRecap();
    }, [laneId]);

    const fetchRecap = async () => {
        try {
            const { data } = await supabase
                .from('recaps')
                .select(`
                    *,
                    lane:lanes(*),
                    postings(*)
                `)
                .eq('lane_id', laneId)
                .order('generated_at', { ascending: false })
                .limit(1)
                .single();

            setRecap(data);
        } catch (error) {
            console.error('Error fetching recap:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePostingClick = (posting) => {
        setSelectedPosting(posting);
    };

    const handleRRSearch = async () => {
        if (!searchRR.match(/^RR\d{5}$/)) {
            alert('Please enter a valid RR number (format: RR#####)');
            return;
        }

        const lane = await rrNumberSystem.lookupByRRNumber(searchRR);
        if (lane) {
            // Navigate to the lane's recap
            window.location.href = `/recap/${lane.id}`;
        } else {
            alert('No lane found with this RR number');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!recap) return <div>No recap available</div>;

    return (
        <div className="p-4">
            {/* RR Number Search */}
            <div className="mb-4 flex gap-2">
                <input
                    type="text"
                    value={searchRR}
                    onChange={(e) => setSearchRR(e.target.value.toUpperCase())}
                    placeholder="Enter RR number"
                    className="p-2 border rounded"
                    pattern="RR\d{5}"
                />
                <button
                    onClick={handleRRSearch}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                    Search
                </button>
            </div>

            {/* Lane Info */}
            <div className="mb-4 p-4 bg-gray-100 rounded">
                <h2 className="text-xl font-bold">
                    {recap.lane.origin_city}, {recap.lane.origin_state} → 
                    {recap.lane.dest_city}, {recap.lane.dest_state}
                </h2>
                <p>Equipment: {recap.lane.equipment_code}</p>
                <p>RR Number: {recap.lane.reference_id}</p>
            </div>

            {/* Intelligent Insights */}
            {recap.insights && recap.insights.length > 0 && (
                <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Market Insights</h3>
                    <div className="grid gap-2">
                        {recap.insights.map((insight, i) => (
                            <div key={i} className="p-3 bg-blue-50 rounded">
                                <p className="text-sm">{insight.message}</p>
                                {insight.data && (
                                    <div className="mt-1 text-xs text-gray-600">
                                        {Object.entries(insight.data).map(([key, value]) => (
                                            <span key={key} className="mr-3">
                                                {key}: {value}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Postings List */}
            <div className="grid gap-2">
                {recap.postings.map((posting) => (
                    <div
                        key={posting.id}
                        className={`p-3 border rounded cursor-pointer transition-colors ${
                            selectedPosting?.id === posting.id
                                ? 'bg-blue-100'
                                : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handlePostingClick(posting)}
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium">
                                    {posting.origin_city}, {posting.origin_state} → 
                                    {posting.dest_city}, {posting.dest_state}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Posted: {new Date(posting.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold">${posting.rate || 'N/A'}</p>
                                <p className="text-xs text-gray-500">
                                    RR: {posting.reference_id}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Selected Posting Details */}
            {selectedPosting && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
                    <h3 className="text-lg font-semibold mb-2">
                        Posting Details (RR: {selectedPosting.reference_id})
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium">Origin</p>
                            <p>{selectedPosting.origin_city}, {selectedPosting.origin_state}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Destination</p>
                            <p>{selectedPosting.dest_city}, {selectedPosting.dest_state}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Equipment</p>
                            <p>{selectedPosting.equipment_code}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Rate</p>
                            <p>${selectedPosting.rate || 'N/A'}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedPosting(null)}
                        className="mt-4 px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}

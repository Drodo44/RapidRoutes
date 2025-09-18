import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import Header from '../components/Header';
import { generateGeographicCrawlPairs } from '../lib/geographicCrawl';

export default function PostOptions() {
  const router = useRouter();
  const [lanes, setLanes] = useState([]);
  const [generatingPairings, setGeneratingPairings] = useState(false);
  const [pairings, setPairings] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch pending lanes on component mount
  useEffect(() => {
    fetchPendingLanes();
  }, []);

  const fetchPendingLanes = async () => {
    try {
      const { data, error } = await supabase
        .from('lanes')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLanes(data || []);
    } catch (error) {
      console.error('Error fetching lanes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePairingsForLane = async (lane) => {
    console.log('Generating pairings for lane:', lane.id);
    setGeneratingPairings(true);
    
    try {
      const pairs = await generateGeographicCrawlPairs(
        lane.origin_city,
        lane.origin_state, 
        lane.dest_city,
        lane.dest_state
      );
      
      console.log(`Generated ${pairs.length} pairs for lane ${lane.id}`);
      
      setPairings(prev => ({
        ...prev,
        [lane.id]: pairs
      }));
    } catch (error) {
      console.error('Error generating pairings for lane:', lane.id, error);
      setPairings(prev => ({
        ...prev,
        [lane.id]: []
      }));
    } finally {
      setGeneratingPairings(false);
    }
  };

  const generateAllPairings = async () => {
    setGeneratingPairings(true);
    const newPairings = {};
    
    for (const lane of lanes) {
      try {
        console.log('Generating pairings for lane:', lane.id);
        const pairs = await generateGeographicCrawlPairs(
          lane.origin_city,
          lane.origin_state, 
          lane.dest_city,
          lane.dest_state
        );
        
        console.log(`Generated ${pairs.length} pairs for lane ${lane.id}`);
        newPairings[lane.id] = pairs;
      } catch (error) {
        console.error('Error generating pairings for lane:', lane.id, error);
        newPairings[lane.id] = [];
      }
    }
    
    setPairings(newPairings);
    setGeneratingPairings(false);
  };

  const generateReferenceId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RR${timestamp}${random}`;
  };

  const formatLaneCard = (lane) => {
    const originZip = lane.origin_zip ? `, ${lane.origin_zip}` : '';
    const destZip = lane.dest_zip ? `, ${lane.dest_zip}` : '';
    const refId = generateReferenceId();
    
    return `${lane.origin_city}, ${lane.origin_state}${originZip} → ${lane.dest_city}, ${lane.dest_state}${destZip} | ${lane.equipment_code} | ${refId}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add toast notification here
      console.log('Copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-900">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <div className="text-gray-400">Loading pending lanes...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-100">Post Options</h1>
              <p className="text-gray-400 mt-2">Manual posting workflow for {lanes.length} pending lanes</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/lanes')}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium"
              >
                ← Back to Lanes
              </button>
              <button
                onClick={generateAllPairings}
                disabled={generatingPairings || lanes.length === 0}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
              >
                {generatingPairings 
                  ? '🔄 Generating Pairings...' 
                  : `🎯 Generate All Pairings (${lanes.length})`
                }
              </button>
            </div>
          </div>

          {/* Lane Cards */}
          {lanes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">No pending lanes found</div>
              <button
                onClick={() => router.push('/lanes')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Add New Lane
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {lanes.map((lane) => (
                <div key={lane.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  {/* Lane Card Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div 
                      className="bg-gray-700 p-4 rounded-lg font-mono text-sm text-gray-100 cursor-pointer hover:bg-gray-600 transition-colors"
                      onClick={() => copyToClipboard(formatLaneCard(lane))}
                      title="Click to copy to clipboard"
                    >
                      {formatLaneCard(lane)}
                    </div>
                    <button
                      onClick={() => generatePairingsForLane(lane)}
                      disabled={generatingPairings}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm ml-4"
                    >
                      {generatingPairings ? '🔄' : '🎯'} Generate Pairings
                    </button>
                  </div>

                  {/* Lane Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <div className="text-gray-400">Weight</div>
                      <div className="text-gray-200">{lane.weight_lbs?.toLocaleString()} lbs</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Equipment</div>
                      <div className="text-gray-200">{lane.equipment_code}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Pickup Earliest</div>
                      <div className="text-gray-200">{lane.pickup_earliest || 'Not set'}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Pickup Latest</div>
                      <div className="text-gray-200">{lane.pickup_latest || 'Not set'}</div>
                    </div>
                  </div>

                  {/* City Pairings */}
                  {pairings[lane.id] && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-100 mb-3">
                        City Pairings ({pairings[lane.id].length})
                      </h3>
                      {pairings[lane.id].length === 0 ? (
                        <div className="text-red-400 bg-red-900/20 p-3 rounded-lg">
                          ⚠️ No city pairings generated. Intelligence system may need attention.
                        </div>
                      ) : (
                        <div className="grid gap-2 max-h-96 overflow-y-auto">
                          {pairings[lane.id].map((pair, index) => (
                            <div 
                              key={index}
                              className="bg-gray-700 p-3 rounded text-sm font-mono cursor-pointer hover:bg-gray-600 transition-colors"
                              onClick={() => copyToClipboard(`${pair.origin.city}, ${pair.origin.state} → ${pair.destination.city}, ${pair.destination.state}`)}
                              title="Click to copy to clipboard"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-gray-100">
                                  {pair.origin.city}, {pair.origin.state} → {pair.destination.city}, {pair.destination.state}
                                </span>
                                <div className="flex gap-2 text-xs text-gray-400">
                                  <span>KMA: {pair.origin.kma_code} → {pair.destination.kma_code}</span>
                                  {pair.freight_score && (
                                    <span>Score: {pair.freight_score.toFixed(1)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
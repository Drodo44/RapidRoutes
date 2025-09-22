import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import Header from '../components/Header';
// Auth utilities for token management
import { getCurrentToken, getTokenInfo } from '../utils/authUtils';

export default function PostOptions() {
  const router = useRouter();
  const [lanes, setLanes] = useState([]);
  const [generatingPairings, setGeneratingPairings] = useState(false);
  const [pairings, setPairings] = useState({});
  const [rrNumbers, setRRNumbers] = useState({});
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

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
    setGeneratingPairings(true);
    setAlert(null);
    try {
      console.debug(`Generating pairings for lane ID: ${lane.id}`);
      
      // Validate required input fields first
      const requiredFields = [
        { name: 'Origin City', value: lane.origin_city },
        { name: 'Origin State', value: lane.origin_state },
        { name: 'Destination City', value: lane.dest_city },
        { name: 'Destination State', value: lane.dest_state },
        { name: 'Equipment Code', value: lane.equipment_code }
      ];
      
      // Check for missing required fields
      const missingFields = requiredFields.filter(field => !field.value);
      if (missingFields.length > 0) {
        const missingFieldNames = missingFields.map(f => f.name).join(', ');
        console.error(`Validation error: Missing required fields: ${missingFieldNames}`, lane);
        setAlert({ 
          type: 'error', 
          message: `Missing required data: ${missingFieldNames}. Please complete the lane details before generating pairings.` 
        });
        setGeneratingPairings(false);
        return;
      }

      // Import the auth utilities
      const { getCurrentToken, getTokenInfo } = await import('../utils/authUtils');
      
      // Get current token with auto-refresh capability
      console.log('Awaiting authentication session...');
      const { token, user, error: authError } = await getCurrentToken();
      
      // Enhanced error handling for authentication issues
      if (authError || !token) {
        console.error('Authentication error:', authError?.message || 'No valid token');
        setAlert({ type: 'error', message: `Authentication error: ${authError?.message || 'Please log in again'}` });
        setGeneratingPairings(false);
        return;
      }
      
      // Verify that the token is still valid
      const tokenStatus = getTokenInfo(token);
      if (!tokenStatus.valid) {
        console.error(`Token validation failed: ${tokenStatus.reason}`, {
          timeLeft: tokenStatus.timeLeft,
          expiresAt: tokenStatus.expiresAt
        });
        setAlert({ type: 'error', message: `Session expired: ${tokenStatus.reason}. Please refresh the page and try again.` });
        setGeneratingPairings(false);
        return;
      }
      
      // Debug logging for authentication state
      const tokenInfo = getTokenInfo(token);
      console.debug(`Auth check for lane ${lane.id}:`, {
        userId: user?.id,
        tokenValid: tokenInfo.valid,
        tokenExpiry: tokenInfo.expiresAt,
        timeRemaining: tokenInfo.timeLeft,
        laneDetails: `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`
      });
      
      // Properly format the request with all required authentication
      const response = await fetch('/api/intelligence-pairing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', // ensure cookies also flow
        body: JSON.stringify({
          originCity: lane.origin_city,
          originState: lane.origin_state,
          originZip: lane.origin_zip || '',
          destCity: lane.dest_city,
          destState: lane.dest_state,
          destZip: lane.dest_zip || '',
          equipmentCode: lane.equipment_code || 'V'
        })
      });
      
      console.debug(`API response for lane ${lane.id}: status=${response.status}`);
      
      // Parse the response
      const result = await response.json();
      
      // Handle authentication errors specifically
      if (response.status === 401) {
        console.error('Authentication failed:', result.message || 'Unauthorized');
        setAlert({ type: 'error', message: 'Authentication failed - please log in again' });
        setGeneratingPairings(false);
        return;
      }
      
      // Handle other API errors
      if (!response.ok || !result.success) {
        const errorMsg = result.message || result.error || 'Failed to generate pairings';
        console.error(`API error for lane ${lane.id}:`, errorMsg);
        throw new Error(errorMsg);
      }
      
  const pairs = Array.isArray(result.pairs) ? result.pairs : [];
      if (pairs.length < 5) throw new Error('Intelligence system failed: fewer than 5 unique KMAs found');
      setPairings(prev => ({ ...prev, [lane.id]: pairs }));
      // Only generate RR number after pairings finalized
      const rrResponse = await fetch('/api/rr-number');
      const rrResult = await rrResponse.json();
      const rr = rrResult.success ? rrResult.rrNumber : 'RR00000';
      setRRNumbers(prev => ({ ...prev, [lane.id]: rr }));
      setAlert({ type: 'success', message: `Pairings generated for lane ${lane.id}` });
    } catch (error) {
      setAlert({ type: 'error', message: error.message });
      setPairings(prev => ({ ...prev, [lane.id]: [] }));
    } finally {
      setGeneratingPairings(false);
    }
  };

  const generateAllPairings = async () => {
    setGeneratingPairings(true);
    setAlert(null);
    const newPairings = {};
    const newRRs = {};
    
    // Validate that we have lanes to process
    if (!lanes || lanes.length === 0) {
      console.warn('No lanes available to generate pairings for');
      setAlert({ type: 'warning', message: 'No lanes available to generate pairings for' });
      setGeneratingPairings(false);
      return;
    }
    
    // Pre-validate all lanes to ensure they have required data
    const invalidLanes = lanes.filter(lane => {
      return !lane.origin_city || 
             !lane.origin_state || 
             !lane.dest_city || 
             !lane.dest_state || 
             !lane.equipment_code;
    });
    
    if (invalidLanes.length > 0) {
      console.error(`Found ${invalidLanes.length} lanes with missing required data`, invalidLanes);
      setAlert({ 
        type: 'error', 
        message: `Cannot process batch: ${invalidLanes.length} lanes are missing required data. Please complete all lane details.` 
      });
      setGeneratingPairings(false);
      return;
    }
    
    // Import the auth utilities
    const { getCurrentToken, getTokenInfo } = await import('../utils/authUtils');
      
    // Get current token with auto-refresh capability
    console.log('Awaiting authentication session...');
    const { token, user, error: authError } = await getCurrentToken();
    
    // Enhanced error handling for authentication issues
    if (authError || !token) {
      console.error('Authentication error:', authError?.message || 'No valid token');
      setAlert({ type: 'error', message: `Authentication error: ${authError?.message || 'Please log in again'}` });
      setGeneratingPairings(false);
      return;
    }
    
    // Verify that the token is still valid
    const tokenStatus = getTokenInfo(token);
    if (!tokenStatus.valid) {
      console.error(`Token validation failed: ${tokenStatus.reason}`, {
        timeLeft: tokenStatus.timeLeft,
        expiresAt: tokenStatus.expiresAt
      });
      setAlert({ type: 'error', message: `Session expired: ${tokenStatus.reason}. Please refresh the page and try again.` });
      setGeneratingPairings(false);
      return;
    }
    
    // Debug logging for authentication state
    const tokenInfo = getTokenInfo(token);
    console.debug(`Auth check for batch generation:`, {
      userId: user?.id,
      tokenValid: tokenInfo.valid,
      tokenExpiry: tokenInfo.expiresAt,
      timeRemaining: tokenInfo.timeLeft,
      laneCount: lanes.length
    });
    
    for (const lane of lanes) {
      try {
        console.debug(`Generating pairings for lane ID: ${lane.id}`);
        
        // Properly format the request with all required authentication
        const response = await fetch('/api/intelligence-pairing', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include', // ensure cookies also flow
          body: JSON.stringify({
            originCity: lane.origin_city,
            originState: lane.origin_state,
            originZip: lane.origin_zip || '',
            destCity: lane.dest_city,
            destState: lane.dest_state,
            destZip: lane.dest_zip || '',
            equipmentCode: lane.equipment_code || 'V'
          })
        });
        
        console.debug(`API response for lane ${lane.id}: status=${response.status}`);
        
        // Parse the response
        const result = await response.json();
        
        // Handle authentication errors specifically
        if (response.status === 401) {
          console.error('Authentication failed:', result.message || 'Unauthorized');
          setAlert({ type: 'error', message: 'Authentication failed - please log in again' });
          break; // Stop processing more lanes
        }
        
        // Handle other API errors
        if (!response.ok || !result.success) {
          const errorMsg = result.message || result.error || 'Failed to generate pairings';
          console.error(`API error for lane ${lane.id}:`, errorMsg);
          throw new Error(errorMsg);
        }
        
  const pairs = Array.isArray(result.pairs) ? result.pairs : [];
        if (pairs.length < 5) throw new Error('Intelligence system failed: fewer than 5 unique KMAs found');
        newPairings[lane.id] = pairs;
        const rrResponse = await fetch('/api/rr-number');
        const rrResult = await rrResponse.json();
        const rr = rrResult.success ? rrResult.rrNumber : 'RR00000';
        newRRs[lane.id] = rr;
      } catch (error) {
        setAlert({ type: 'error', message: error.message });
        newPairings[lane.id] = [];
      }
    }
    setPairings(newPairings);
    setRRNumbers(newRRs);
    setGeneratingPairings(false);
    setAlert({ type: 'success', message: 'Pairings generated for all lanes.' });
  };

  const generateReferenceId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RR${timestamp}${random}`;
  };

  const formatLaneCard = (lane) => {
    const originZip = lane.origin_zip ? `, ${lane.origin_zip}` : '';
    const destZip = lane.dest_zip ? `, ${lane.dest_zip}` : '';
    const rr = rrNumbers[lane.id] || 'RR#####';
    return `${lane.origin_city}, ${lane.origin_state}${originZip} → ${lane.dest_city}, ${lane.dest_state}${destZip} | ${lane.equipment_code} | ${rr}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setAlert({ type: 'success', message: 'Copied to clipboard.' });
    }).catch(err => {
      setAlert({ type: 'error', message: 'Failed to copy.' });
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
              {process.env.NODE_ENV !== 'production' && (
                <button
                  onClick={async () => {
                    try {
                      setAlert({ type: 'info', message: 'Testing authentication flow...' });
                      const { testAuthFlow } = await import('../utils/testAuthFlow');
                      const result = await testAuthFlow();
                      if (result.success) {
                        setAlert({ type: 'success', message: 'Auth flow test completed - check console for details' });
                      } else {
                        setAlert({ type: 'error', message: `Auth flow test failed: ${result.error}` });
                      }
                    } catch (error) {
                      setAlert({ type: 'error', message: `Auth test error: ${error.message}` });
                    }
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
                >
                  🔍 Test Auth Flow
                </button>
              )}
            </div>
          </div>
          {/* Alert */}
          {alert && (
            <div className={`mb-6 px-4 py-3 rounded-lg font-medium text-sm ${alert.type === 'success' ? 'bg-green-900 text-green-200 border border-green-700' : 'bg-red-900 text-red-200 border border-red-700'}`}>{alert.message}</div>
          )}
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
                      title="Click to copy lane card"
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
                  {/* City Pairings */}
                  {Array.isArray(pairings[lane.id]) && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-100 mb-3">
                        City Pairings ({pairings[lane.id].length})
                      </h3>
                      {Array.isArray(pairings[lane.id]) && pairings[lane.id].length === 0 ? (
                        <div className="bg-red-900 text-red-200 border border-red-700 p-3 rounded-lg">
                          No city pairings generated. Intelligence system may need attention.
                        </div>
                      ) : (
                        <div className="grid gap-2 max-h-96 overflow-y-auto">
                          {pairings[lane.id].map((pair, index) => {
                            // Protect against malformed data
                            if (!pair || !pair.origin || !pair.dest) {
                              return (
                                <div key={index} className="bg-yellow-900 text-yellow-200 border border-yellow-700 p-3 rounded text-sm">
                                  ⚠️ Pair skipped due to incomplete data (missing city/state/zip)
                                </div>
                              );
                            }
                            
                            const originCity = pair.origin.city || 'Unknown';
                            const originState = pair.origin.state || 'Unknown';
                            const originZip = pair.origin.zip ? `, ${pair.origin.zip}` : '';
                            const destCity = pair.dest.city || 'Unknown';
                            const destState = pair.dest.state || 'Unknown';
                            const destZip = pair.dest.zip ? `, ${pair.dest.zip}` : '';
                            
                            const pairText = `${originCity}, ${originState}${originZip} → ${destCity}, ${destState}${destZip}`;
                            
                            return (
                              <div key={index} className="flex items-center justify-between bg-gray-700 p-3 rounded text-sm font-mono">
                                <span className="text-gray-100">
                                  {pairText}
                                  {pair.origin.kma && pair.dest.kma && (
                                    <span className="ml-2 text-xs text-gray-400">
                                      ({pair.origin.kma} → {pair.dest.kma})
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(pairText)}
                                  className="ml-3 px-2 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs"
                                  title="Copy pairing to clipboard"
                                >
                                  Copy
                                </button>
                              </div>
                            );
                          })}
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
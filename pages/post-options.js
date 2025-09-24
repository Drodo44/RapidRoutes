import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import Header from '../components/Header';
// Auth utilities for token management
import { getCurrentToken, getTokenInfo } from '../utils/authUtils';
// Intelligence API adapter for properly formatted API calls
import { callIntelligencePairingApi } from '../utils/intelligenceApiAdapter';

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
      console.log('🔄 Fetching pending lanes from database...');
      const { data, error } = await supabase
        .from('lanes')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log(`📥 Received ${data?.length || 0} lanes from database`);
      
      // Normalize lane data to have both snake_case and camelCase fields
      const normalizedLanes = (data || []).map(lane => {
        // Log the raw lane data to trace field availability
        console.log(`🔍 Raw lane data from DB (ID: ${lane.id}):`, {
          id: lane.id,
          origin_city: lane.origin_city,
          origin_state: lane.origin_state,
          destination_city: lane.destination_city,
          destination_state: lane.destination_state,
          equipment_code: lane.equipment_code,
          // Check if camelCase variants exist in raw data (they shouldn't)
          hasOriginCity: !!lane.originCity,
          hasDestinationCity: !!lane.destinationCity
        });
        
        // Create normalized lane with both formats
        const normalizedLane = {
          ...lane,
          // Add camelCase variants if not present
          originCity: lane.originCity || lane.origin_city,
          originState: lane.originState || lane.origin_state,
          destinationCity: lane.destinationCity || lane.destination_city,
          destinationState: lane.destinationState || lane.destination_state,
          equipmentCode: lane.equipmentCode || lane.equipment_code
        };
        
        // Log the normalized lane to confirm field availability
        console.log(`🔄 Normalized lane (ID: ${lane.id}):`, {
          id: lane.id,
          // Snake case fields
          origin_city: normalizedLane.origin_city,
          origin_state: normalizedLane.origin_state,
          destination_city: normalizedLane.destination_city,
          destination_state: normalizedLane.destination_state,
          // Camel case fields
          originCity: normalizedLane.originCity,
          originState: normalizedLane.originState,
          destinationCity: normalizedLane.destinationCity,
          destinationState: normalizedLane.destinationState
        });
        
        return normalizedLane;
      });
      
      console.log(`📊 Normalized ${normalizedLanes.length} lanes with both snake_case and camelCase fields`);
      setLanes(normalizedLanes);
    } catch (error) {
      console.error('Error fetching lanes:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Ensures that the authentication session is fully initialized and ready
   * @returns {Promise<{ready: boolean, token: string|null, user: object|null, error: Error|null}>}
   */
  const ensureAuthReady = async () => {
    console.log('🔒 Ensuring authentication is ready...');
    try {
      // First, check if Supabase client is loaded
      if (!supabase?.auth) {
        console.error('Authentication client not initialized');
        return { ready: false, token: null, user: null, error: new Error('Authentication client not initialized') };
      }
      
      // Import the auth utilities
      const { getCurrentToken, getTokenInfo } = await import('../utils/authUtils');
      
      // Wait for a session to be available - retry up to 3 times with a short delay
      let attempts = 0;
      let token = null;
      let user = null;
      let authError = null;
      
      while (attempts < 3 && !token) {
        if (attempts > 0) {
          console.log(`Authentication retry attempt ${attempts + 1}/3...`);
          // Small delay between retries (200ms, 400ms)
          await new Promise(resolve => setTimeout(resolve, attempts * 200));
        }
        
        const result = await getCurrentToken();
        token = result.token;
        user = result.user;
        authError = result.error;
        
        if (token) break;
        attempts++;
      }
      
      // Enhanced error handling for authentication issues
      if (authError || !token) {
        console.error('Authentication error after retries:', authError?.message || 'No valid token');
        return { ready: false, token: null, user: null, error: authError || new Error('No valid token available') };
      }
      
      // Verify that the token is still valid
      const tokenStatus = getTokenInfo(token);
      if (!tokenStatus.valid) {
        console.error(`Token validation failed: ${tokenStatus.reason}`, {
          timeLeft: tokenStatus.timeLeft,
          expiresAt: tokenStatus.expiresAt
        });
        return { 
          ready: false, 
          token: null, 
          user: null, 
          error: new Error(`Token invalid: ${tokenStatus.reason}`)
        };
      }
      
      console.log('✅ Authentication ready with valid token');
      return { ready: true, token, user, error: null, tokenInfo: tokenStatus };
    } catch (error) {
      console.error('Failed to initialize authentication:', error);
      return { ready: false, token: null, user: null, error };
    }
  };
  
  const generatePairingsForLane = async (lane) => {
    setGeneratingPairings(true);
    setAlert(null);
    try {
      console.log(`🔄 Generating pairings for lane ID: ${lane.id} - ${lane.origin_city || lane.originCity}, ${lane.origin_state || lane.originState} → ${lane.destination_city || lane.destinationCity}, ${lane.destination_state || lane.destinationState}`);
      
      // Complete lane payload logging
      console.log("🚚 Lane payload:", lane);
      
      // Debug log to track exact data being sent to API
      console.log("🧪 Sending lane to API:", {
        originCity: lane.originCity || lane.origin_city,
        originState: lane.originState || lane.origin_state,
        destinationCity: lane.destinationCity || lane.destination_city,
        destinationState: lane.destinationState || lane.destination_state,
      });
      
      // Validate required input fields first
      const destinationCity = lane.destination_city || lane.destinationCity;
      const destinationState = lane.destination_state || lane.destinationState;
      
      const hasDestinationData = destinationCity || destinationState;
      
      const requiredFields = [
        { name: 'Origin City', value: lane.origin_city || lane.originCity },
        { name: 'Origin State', value: lane.origin_state || lane.originState },
        // Only require both destination fields if both are missing
        { name: 'Destination Data', value: hasDestinationData },
        { name: 'Equipment Code', value: lane.equipment_code || lane.equipmentCode }
      ];
      
      // Check for missing required fields
      const missingFields = requiredFields.filter(field => !field.value);
      if (missingFields.length > 0) {
        const missingFieldNames = missingFields.map(f => f.name).join(', ');
        console.error(`❌ Validation error for Lane ${lane.id}: Missing ${missingFieldNames}`, {
          laneId: lane.id,
          originCity: lane.origin_city || lane.originCity,
          originState: lane.origin_state || lane.originState,
          destinationCity,
          destinationState,
          equipmentCode: lane.equipment_code || lane.equipmentCode
        });
        setAlert({ 
          type: 'error', 
          message: `Missing required data: ${missingFieldNames}. Please provide at least partial origin and destination info.` 
        });
        setGeneratingPairings(false);
        return;
      }

      // Ensure authentication is ready before making API calls
      const { ready, token, user, error: authError, tokenInfo: authTokenInfo } = await ensureAuthReady();
      
      if (!ready || authError || !token) {
        console.error('❌ Authentication not ready:', authError?.message || 'No valid token');
        setAlert({ type: 'error', message: `Authentication error: ${authError?.message || 'Please log in again'}` });
        setGeneratingPairings(false);
        return;
      }
      
      // Debug logging for authentication state
      console.log(`🔐 Auth check for lane ${lane.id}:`, {
        userId: user?.id,
        tokenValid: authTokenInfo.valid,
        tokenExpiry: authTokenInfo.expiresAt,
        timeRemaining: authTokenInfo.timeLeft,
        laneDetails: `${lane.origin_city}, ${lane.origin_state} → ${lane.destination_city}, ${lane.destination_state}`
      });
      
      // Generate a unique request ID for tracing
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      console.log(`📤 [${requestId}] Sending pairing request for lane ${lane.id}...`);
      
      try {
        // Use the intelligenceApiAdapter to make the API call
        // This ensures correct parameter formatting (destinationCity → destCity)
        const result = await callIntelligencePairingApi(lane, {
          // Don't automatically use test mode in production
          useTestMode: false
        });
        
        console.log(`📥 [${requestId}] API success for lane ${lane.id}: ${result.pairs?.length || 0} pairs generated`);
        
        // Process the result and update UI
        const pairs = result.pairs || [];
        setPairings(prev => ({ ...prev, [lane.id]: pairs }));
        setGeneratedLaneId(lane.id);
        setGeneratedEquipmentCode(lane.equipment_code || lane.equipmentCode);
        setShowPairings(true);
        setGeneratingPairings(false);
        
      } catch (error) {
        console.error(`❌ [${requestId}] API error:`, error);
        
        // Check if it's an authentication error
        if (error.message && error.message.includes('401')) {
          setAlert({ type: 'error', message: 'Authentication failed - please log in again' });
          setGeneratingPairings(false);
          return;
        }
        
        // Handle general errors
        setAlert({ type: 'error', message: `Failed to generate pairings: ${error.message}` });
        setGeneratingPairings(false);
      }
      
      // Handle 422 KMA diversity errors as soft warnings
      if (response.status === 422 && 
          (result.error?.includes('KMA') || result.details?.includes('KMA') || 
           result.error?.includes('unique') || result.details?.includes('unique'))) {
        console.warn(`⚠️ [${requestId}] KMA diversity requirement not met for lane ${lane.id}:`, result.details || result.error);
        setAlert({ 
          type: 'warning', 
          message: `Lane ${lane.id}: ${result.details || 'Insufficient KMA diversity'} - skipped`
        });
        setPairings(prev => ({ ...prev, [lane.id]: [] }));
        setGeneratingPairings(false);
        return;
      }
      
      // Handle city lookup errors with detailed information
      if (response.status === 400 && 
          (result.error?.includes('city not found') || result.error?.includes('city lookup'))) {
        console.error(`❌ [${requestId}] City lookup failed for lane ${lane.id}:`, {
          status: response.status,
          error: result.error,
          details: result.details || {}
        });
        
        // Format a more useful error message showing which city was not found
        const cityDetails = result.details || {};
        const errorCity = cityDetails.origin_city && cityDetails.origin_state 
          ? `${cityDetails.origin_city}, ${cityDetails.origin_state}` 
          : (cityDetails.destination_city && cityDetails.destination_state 
            ? `${cityDetails.destination_city}, ${cityDetails.destination_state}`
            : 'Unknown city');
            
        throw new Error(`City not found in database: ${errorCity} (Status: ${response.status})`);
      }
      
      // Handle other API errors
      if (!response.ok || !result.success) {
        const errorMsg = result.details || result.error || result.message || 'Failed to generate pairings';
        console.error(`❌ [${requestId}] API error for lane ${lane.id}:`, {
          status: response.status,
          error: errorMsg,
          details: result
        });
        throw new Error(`${errorMsg} (Status: ${response.status})`);
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
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // Start time for performance measurement
    const batchStartTime = Date.now();
    console.log('🚀 Starting batch pairing generation...');
    
    // Validate that we have lanes to process
    if (!lanes || lanes.length === 0) {
      console.warn('⚠️ No lanes available to generate pairings for');
      setAlert({ type: 'warning', message: 'No lanes available to generate pairings for' });
      setGeneratingPairings(false);
      return;
    }
    
    console.log(`📋 Pre-validating ${lanes.length} lanes before processing`);
    
    // Pre-validate all lanes to ensure they have required data
    const invalidLanes = lanes.filter(lane => {
      console.log(`🔍 Validating lane ID ${lane.id} with field availability:`, {
        // Raw field values to check exactly what's present
        raw_origin_city: lane.origin_city,
        raw_originCity: lane.originCity,
        raw_origin_state: lane.origin_state, 
        raw_originState: lane.originState,
        raw_destination_city: lane.destination_city,
        raw_destinationCity: lane.destinationCity,
        raw_destination_state: lane.destination_state,
        raw_destinationState: lane.destinationState
      });
      
      const originCity = lane.origin_city || lane.originCity;
      const originState = lane.origin_state || lane.originState;
      const destinationCity = lane.destination_city || lane.destinationCity;
      const destinationState = lane.destination_state || lane.destinationState;
      const equipmentCode = lane.equipment_code || lane.equipmentCode;
      
      // Allow partial destination data (either city or state is acceptable)
      const hasDestinationData = destinationCity || destinationState;
      
      const missing = !originCity || !originState || !hasDestinationData || !equipmentCode;
             
      if (missing) {
        console.error(`❌ Lane ${lane.id} invalid: Missing required fields`, {
          laneId: lane.id,
          originCity: !!originCity,
          originState: !!originState,
          hasDestinationData: !!hasDestinationData,
          destinationCity: !!destinationCity,
          destinationState: !!destinationState,
          equipmentCode: !!equipmentCode
        });
      } else {
        console.log(`✅ Lane ${lane.id} passed validation with fields:`, {
          originCity,
          originState,
          destinationCity,
          destinationState,
          equipmentCode
        });
      }
      return missing;
    });
    
    if (invalidLanes.length > 0) {
      console.error(`❌ Found ${invalidLanes.length} lanes with missing required data`, invalidLanes);
      setAlert({ 
        type: 'error', 
        message: `Cannot process batch: ${invalidLanes.length} lanes are missing required data. Please complete all lane details.` 
      });
      setGeneratingPairings(false);
      return;
    }
    
    // Ensure authentication is ready before making API calls
    console.log('🔒 Initializing authentication for batch processing...');
    const { ready, token, user, error: authError, tokenInfo: authTokenInfo } = await ensureAuthReady();
    
    if (!ready || authError || !token) {
      console.error('❌ Authentication not ready:', authError?.message || 'No valid token');
      setAlert({ type: 'error', message: `Authentication error: ${authError?.message || 'Please log in again'}` });
      setGeneratingPairings(false);
      return;
    }
    
    // Debug logging for authentication state
    console.log(`🔐 Auth check for batch generation:`, {
      userId: user?.id,
      tokenValid: authTokenInfo.valid,
      tokenExpiry: authTokenInfo.expiresAt,
      timeRemaining: authTokenInfo.timeLeft,
      laneCount: lanes.length
    });
    
    const validLanes = [...lanes];
    let processedCount = 0;
    
    // Process lanes in batches of 5 to avoid overloading the API
    while (validLanes.length > 0) {
      const batchLanes = validLanes.splice(0, 5);
      const batchPromises = batchLanes.map(async lane => {
        try {
          // Generate a unique request ID for tracing
          const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
          console.log(`🔄 [${requestId}] Processing lane ${lane.id} (${++processedCount}/${lanes.length}): ${lane.origin_city || lane.originCity}, ${lane.origin_state || lane.originState} → ${lane.destination_city || lane.destinationCity}, ${lane.destination_state || lane.destinationState}`);
          
          // Prepare API request body for each lane
          const requestBody = {
            lane_id: lane.id,
            origin_city: lane.originCity || lane.origin_city,
            origin_state: lane.originState || lane.origin_state,
            destination_city: lane.destinationCity || lane.destination_city,
            destination_state: lane.destinationState || lane.destination_state
          };
          
          // Complete lane payload logging
          console.log("🚚 Lane payload:", lane);
          
          // Debug log to track exact data being sent to API
          console.log("🧪 Sending lane to API:", {
            originCity: lane.originCity || lane.origin_city,
            originState: lane.originState || lane.origin_state,
            destCity: lane.destinationCity || lane.destination_city,
            destState: lane.destinationState || lane.destination_state,
          });
          
          // Use the intelligenceApiAdapter to make the API call with proper parameter formatting
          try {
            // Use adapter to ensure correct parameter naming (destinationCity → destCity)
            const result = await callIntelligencePairingApi(lane, {
              // Don't automatically use test mode in production
              useTestMode: false
            });
            
            // Log success
            console.log(`📥 [${requestId}] API success for lane ${lane.id}: ${result.pairs?.length || 0} pairs generated`);
            
            // Process successful result
            const pairs = result.pairs || [];
            if (pairs.length === 0) {
              return {
                laneId: lane.id,
                success: true,
                pairs: [],
                message: 'No pairs generated - verify lane coordinates and check route viability'
              };
            }
            
            return {
              laneId: lane.id,
              success: true,
              pairs,
              message: `${pairs.length} pairings generated`
            };
            
          } catch (error) {
            console.error(`❌ [${requestId}] API error:`, error);
            
            // Check if it's an authentication error
            if (error.message && error.message.includes('401')) {
              errorCount++;
              return { 
                laneId: lane.id, 
                success: false, 
                error: 'Authentication failed',
                stop: true // Signal to stop processing
              };
            }
            
            // Handle general errors
            errorCount++;
            return {
              laneId: lane.id,
              success: false,
              error: error.message || 'API error'
            };
          }
          
          // Handle 422 KMA diversity errors as soft warnings
          if (response.status === 422 && 
              (result.error?.includes('KMA') || result.details?.includes('KMA') || 
              result.error?.includes('unique') || result.details?.includes('unique'))) {
            console.warn(`⚠️ [${requestId}] KMA diversity requirement not met for lane ${lane.id}:`, result.details || result.error);
            skipCount++;
            return { 
              laneId: lane.id, 
              success: false, 
              error: result.details || 'Insufficient KMA diversity',
              pairs: [],
              skipped: true
            };
          }
          
          // Handle city lookup errors with detailed information
          if (response.status === 400 && 
              (result.error?.includes('city not found') || result.error?.includes('city lookup'))) {
            console.error(`❌ [${requestId}] City lookup failed for lane ${lane.id}:`, {
              status: response.status,
              error: result.error,
              details: result.details || {}
            });
            
            // Format a more useful error message showing which city was not found
            const cityDetails = result.details || {};
            const errorCity = cityDetails.origin_city && cityDetails.origin_state 
              ? `${cityDetails.origin_city}, ${cityDetails.origin_state}` 
              : (cityDetails.destination_city && cityDetails.destination_state 
                ? `${cityDetails.destination_city}, ${cityDetails.destination_state}`
                : 'Unknown city');
                
            errorCount++;
            return {
              laneId: lane.id,
              success: false,
              error: `City not found in database: ${errorCity}`,
              details: result.details
            };
          }
            
          // Handle other API errors
          if (!response.ok || !result.success) {
            const errorMsg = result.details || result.error || result.message || 'Failed to generate pairings';
            console.error(`❌ [${requestId}] API error for lane ${lane.id}:`, {
              status: response.status,
              error: errorMsg,
              details: result
            });
            errorCount++;
            return { 
              laneId: lane.id, 
              success: false, 
              error: `${errorMsg} (Status: ${response.status})`,
              pairs: []
            };
          }
          
          // Success path
          const pairs = Array.isArray(result.pairs) ? result.pairs : [];
          if (pairs.length < 6) {
            console.warn(`⚠️ [${requestId}] Insufficient pairs (${pairs.length}) for lane ${lane.id}`);
            skipCount++;
            return { 
              laneId: lane.id, 
              success: false, 
              error: `Only ${pairs.length} pairs found (minimum 6 required)`,
              pairs: [],
              skipped: true
            };
          }
          
          // Generate reference number
          const rrResponse = await fetch('/api/rr-number');
          const rrResult = await rrResponse.json();
          const rr = rrResult.success ? rrResult.rrNumber : 'RR00000';
          
          console.log(`✅ [${requestId}] Successfully generated ${pairs.length} pairs for lane ${lane.id}`);
          successCount++;
          return { 
            laneId: lane.id, 
            success: true, 
            pairs, 
            rr,
            uniqueKmas: result.uniqueKmas || 'unknown'
          };
        } catch (error) {
          console.error(`❌ Error processing lane ${lane.id}:`, error);
          errorCount++;
          return { 
            laneId: lane.id, 
            success: false, 
            error: error.message || 'Unknown error',
            pairs: []
          };
        }
      });
      
      // Wait for all lanes in this batch to complete
      const results = await Promise.all(batchPromises);
      
      // Process results
      for (const result of results) {
        if (result.success) {
          newPairings[result.laneId] = result.pairs;
          newRRs[result.laneId] = result.rr;
        } else {
          newPairings[result.laneId] = [];
          
          // If authentication failed, stop processing
          if (result.stop) {
            setAlert({ type: 'error', message: 'Authentication failed - please log in again' });
            setPairings(newPairings);
            setRRNumbers(newRRs);
            setGeneratingPairings(false);
            return;
          }
        }
      }
      
      // Small delay to avoid rate limits
      if (validLanes.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // Calculate performance stats
    const totalTime = Date.now() - batchStartTime;
    const avgTimePerLane = Math.round(totalTime / lanes.length);
    
    console.log(`✨ Batch processing complete: ${successCount} success, ${skipCount} skipped, ${errorCount} errors in ${totalTime}ms (avg: ${avgTimePerLane}ms/lane)`);
    
    setPairings(newPairings);
    setRRNumbers(newRRs);
    setGeneratingPairings(false);
    
    // Set appropriate alert message based on results
    if (errorCount === 0 && skipCount === 0) {
      setAlert({ type: 'success', message: `Pairings generated for all ${lanes.length} lanes successfully.` });
    } else if (errorCount === 0 && skipCount > 0) {
      setAlert({ type: 'warning', message: `Completed with ${successCount} successful lanes. ${skipCount} lanes skipped due to KMA requirements.` });
    } else {
      setAlert({ type: 'warning', message: `Completed with mixed results: ${successCount} success, ${skipCount} skipped, ${errorCount} errors.` });
    }
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
    return `${lane.origin_city}, ${lane.origin_state}${originZip} → ${lane.destination_city}, ${lane.destination_state}${destZip} | ${lane.equipment_code} | ${rr}`;
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
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
// Import original API clients to avoid breaking changes
import { createClient } from '@supabase/supabase-js';
import supabase from '../utils/supabaseClient';
// Import original components
import Header from '../components/Header';
// Import error boundary
import ErrorBoundary from '../components/ErrorBoundary';

// Diagnostic logging to debug React Error #130
console.log('[DIAG] post-options.js module loaded');
console.log('[DIAG] Header import type:', typeof Header);
console.log('[DIAG] ErrorBoundary import type:', typeof ErrorBoundary);

export default function PostOptions() {
  // Add diagnostic logging
  console.log('PostOptions component rendering');
  console.log('⭐ All error boundaries active and diagnostic logging enabled');
  
  const router = useRouter();
  const [lanes, setLanes] = useState([]);
  const [generatingPairings, setGeneratingPairings] = useState(false);
  const [pairings, setPairings] = useState({});
  const [rrNumbers, setRRNumbers] = useState({});
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [laneStats, setLaneStats] = useState({});
  const [laneWarnings, setLaneWarnings] = useState({});
  const [debugMode, setDebugMode] = useState(false);
  const [generatedLaneId, setGeneratedLaneId] = useState(null);
  const [generatedEquipmentCode, setGeneratedEquipmentCode] = useState(null);
  const [showPairings, setShowPairings] = useState(false);
  const [selectedPairs, setSelectedPairs] = useState({}); // { laneId: [pairIndex1, pairIndex2, ...] }
  const [savingCities, setSavingCities] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        const debugParam = url.searchParams.get('debug');
        const envFlag = process.env.NEXT_PUBLIC_PAIRING_DEBUG === 'true';
        setDebugMode(debugParam === '1' || envFlag);
      } catch (e) {
        console.warn('Failed to init debug mode', e);
      }
    }
  }, []);

  // Dev-only seed lanes if none present and debug mode enabled (helps local smoke test without DB)
  useEffect(() => {
    if (debugMode && lanes.length === 0) {
      const seeded = [
        { id: 1001, origin_city: 'Fitzgerald', origin_state: 'GA', destination_city: 'Winter Haven', destination_state: 'FL', equipment_code: 'V' },
        { id: 1002, origin_city: 'Augusta', origin_state: 'GA', destination_city: 'Stephenson', destination_state: 'VA', equipment_code: 'V' },
        { id: 1003, origin_city: 'Riegelwood', origin_state: 'NC', destination_city: 'Altamont', destination_state: 'NY', equipment_code: 'V' }
      ];
      setLanes(seeded.map(l => ({
        ...l,
        originCity: l.origin_city,
        originState: l.origin_state,
        destinationCity: l.destination_city,
        destinationState: l.destination_state,
        equipmentCode: l.equipment_code
      })));
      console.log('🧪 Debug seed lanes injected');
    }
  }, [debugMode, lanes.length]);

  // Fetch pending lanes on component mount
  useEffect(() => {
    fetchPendingLanes();
  }, []);

  const fetchPendingLanes = async () => {
    try {
      console.log('🔄 Fetching current lanes from database...');
      const { data, error } = await supabase
        .from('lanes')
        .select('*')
        .eq('lane_status', 'current')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log(`📥 Received ${data?.length || 0} lanes from database`);
      
      // Normalize lane data to have both snake_case and camelCase fields
      const normalizedLanes = (data || []).map(lane => {
        console.log(`🔍 Raw lane data from DB (ID: ${lane.id}):`, {
          id: lane.id,
          origin_city: lane.origin_city,
          origin_state: lane.origin_state,
          destination_city: lane.destination_city,
          destination_state: lane.destination_state,
          equipment_code: lane.equipment_code
        });
        
        // IMPORTANT: Create a new lane object with both snake_case and camelCase properties
        // This ensures all validation checks will find the fields regardless of format used
        const normalizedLane = {
          ...lane,
          originCity: lane.originCity || lane.origin_city,
          originState: lane.originState || lane.origin_state,
          destinationCity: lane.destinationCity || lane.destination_city || lane.dest_city,
          destinationState: lane.destinationState || lane.destination_state || lane.dest_state,
          equipmentCode: lane.equipmentCode || lane.equipment_code
        };
        
        console.log(`✅ Normalized lane (ID: ${normalizedLane.id}):`, {
          // Both formats to verify successful normalization
          origin_city: normalizedLane.origin_city,
          originCity: normalizedLane.originCity,
          
          origin_state: normalizedLane.origin_state, 
          originState: normalizedLane.originState,
          
          destination_city: normalizedLane.destination_city,
          destinationCity: normalizedLane.destinationCity,
          
          destination_state: normalizedLane.destination_state,
          destinationState: normalizedLane.destinationState,
          
          equipment_code: normalizedLane.equipment_code,
          equipmentCode: normalizedLane.equipmentCode
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
      
      // Use our safe imports instead of dynamic imports to fix React Error #130
      console.log('Using safeGetCurrentToken and safeGetTokenInfo to avoid React Error #130');
      
      // CRITICAL FIX: Force a session refresh from Supabase first
      try {
        const { data } = await supabase.auth.getSession();
        console.log('🔐 Current session state:', {
          hasSession: !!data?.session,
          expiresAt: data?.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'none',
          userId: data?.session?.user?.id || 'none'
        });
      } catch (sessionErr) {
        console.warn('⚠️ Failed to get current session:', sessionErr?.message);
      }
      
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
        
        const result = await safeGetCurrentToken();
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
      const tokenStatus = safeGetTokenInfo(token);
      if (!tokenStatus?.valid) {
        console.error(`Token validation failed: ${tokenStatus?.reason || 'Unknown error'}`, {
          timeLeft: tokenStatus?.timeLeft,
          expiresAt: tokenStatus?.expiresAt
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
      
      // Normalize all field name variants (camelCase + snake_case)
      const originCity = lane.originCity || lane.origin_city;
      const originState = lane.originState || lane.origin_state;
      const destinationCity = lane.destinationCity || lane.destination_city || lane.dest_city;
      const destinationState = lane.destinationState || lane.destination_state || lane.dest_state;
      const equipmentCode = lane.equipmentCode || lane.equipment_code;

      // Accept if either destinationCity OR destinationState is provided
      const hasDestinationData = destinationCity || destinationState;

      // Final validation
      if (!originCity || !originState || !equipmentCode || !hasDestinationData) {
        console.error(`❌ Lane ${lane.id || lane.lane_id || 'new'} invalid:`, {
          originCity: !!originCity,
          originState: !!originState,
          destinationCity: !!destinationCity,
          destinationState: !!destinationState,
          hasDestinationData,
          equipmentCode: !!equipmentCode
        });
        
        const missingFields = [];
        if (!originCity) missingFields.push('Origin City');
        if (!originState) missingFields.push('Origin State');
        if (!hasDestinationData) missingFields.push('Destination Data (either city or state)');
        if (!equipmentCode) missingFields.push('Equipment Code');
        
        const missingFieldNames = missingFields.join(', ');
        setAlert({ 
          type: 'error', 
          message: `Missing required data: ${missingFieldNames}. At least one destination field is required.` 
        });
        setGeneratingPairings(false);
        return;
      }
      
      console.log("✅ Pre-validation passed:", {
        laneId: lane.id,
        originCity: !!originCity,
        originState: !!originState,
        destinationCity: !!destinationCity,
        destinationState: !!destinationState,
        hasDestinationData,
        equipmentCode: !!equipmentCode,
        // Include actual values for better debugging
        originCityValue: originCity,
        originStateValue: originState,
        destinationCityValue: destinationCity,
        destinationStateValue: destinationState
      });

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
        // Debug log token in use
        console.log(`🔑 Using token for API call: ${token ? token.substring(0, 10) + '...' : 'none'}`);
        
        // Check if we're in development environment
        const isDev = typeof window !== 'undefined' && 
                     window.location.hostname === 'localhost' ||
                     process.env.NODE_ENV !== 'production';

        // Make direct API call instead of using safeCallIntelligencePairingApi
        console.log('Making direct API call to /api/intelligence/generate-pairings');
        const response = await fetch('/api/intelligence/generate-pairings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            lane_id: lane.id,
            origin_city: originCity,
            origin_state: originState,
            destination_city: destinationCity,
            destination_state: destinationState,
            equipment_code: equipmentCode,
            // Add these for debug purposes
            test_mode: isDev, // Enable test mode in development
            debug_env: true  // Enable detailed API debugging
          })
        });
        
        console.log('API response status:', response.status);
        let result;
        try {
          result = await response.json();
          console.log('API response parsed as JSON:', result);
        } catch (parseError) {
          console.error('Failed to parse API response as JSON:', parseError);
          const text = await response.text();
          console.log('Raw API response:', text);
          throw new Error(`API response parsing failed: ${parseError.message}`);
        }
        
        console.log(`📥 API response for lane ${lane.id}:`, {
          status: result.status || result.statusCode,
          error: result.error || null,
          totalCityPairs: result.totalCityPairs,
          uniqueOriginKmas: result.uniqueOriginKmas,
          uniqueDestKmas: result.uniqueDestKmas,
          pairsCount: Array.isArray(result.pairs) ? result.pairs.length : 0
        });
        console.log('🔢 Diversity stats:', {
          laneId: lane.id,
          totalCityPairs: result.totalCityPairs,
          uniqueOriginKmas: result.uniqueOriginKmas,
          uniqueDestKmas: result.uniqueDestKmas
        });
        
        // intelligenceApiAdapter already returns parsed JSON
        
        // Handle 422 KMA diversity errors as soft warnings
        if (result.status === 422 || result.statusCode === 422) {
          console.warn(`⚠️ [${requestId}] Diversity gating for lane ${lane.id}:`, result.error || result.details);
          setAlert({ type: 'warning', message: `Lane ${lane.id}: ${result.error || 'Diversity requirement not met'} (skipped)` });
          setPairings(prev => ({ ...prev, [lane.id]: [] }));
          setLaneWarnings(prev => ({ ...prev, [lane.id]: result.error || 'Diversity requirement not met' }));
          setLaneStats(prev => ({ ...prev, [lane.id]: {
            totalCityPairs: result.totalCityPairs || 0,
            uniqueOriginKmas: result.uniqueOriginKmas || 0,
            uniqueDestKmas: result.uniqueDestKmas || 0
          }}));
          setGeneratingPairings(false);
          return;
        }
        
        // Handle city lookup errors with detailed information
        if ((result.status === 400 || result.statusCode === 400) && 
            (typeof result.error === 'string' && (result.error?.includes('city not found') || result.error?.includes('city lookup')))) {
          console.error(`❌ [${requestId}] City lookup failed for lane ${lane.id}:`, {
            status: result.status,
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
              
          throw new Error(`City not found in database: ${errorCity} (Status: ${result.status})`);
        }
        
        // Handle other API errors
        if (result.error) {
          throw new Error(result.error);
        }
        
        console.log(`📥 [${requestId}] API success for lane ${lane.id}: ${result.pairs?.length || 0} pairs generated`);
        
        // Process the result and update UI (no client-side fallback injection)
        const pairs = Array.isArray(result.pairs) ? result.pairs : [];
        
        // Detailed inspection of pairs data structure
        console.log(`🔍 Inspecting pairs for lane ${lane.id}:`);
        console.log(`Pairs array type: ${typeof pairs}, isArray: ${Array.isArray(pairs)}, length: ${pairs.length}`);
        
        if (pairs.length > 0) {
          console.log('First pair sample:', pairs[0]);
          console.log('First pair origin type:', typeof pairs[0]?.origin);
          console.log('First pair destination type:', typeof pairs[0]?.destination);
          
          // Check if any pairs have malformed structure
          const malformedPairs = pairs.filter(p => 
            typeof p !== 'object' || 
            !p || 
            typeof p.origin !== 'object' || 
            typeof p.destination !== 'object'
          );
          
          if (malformedPairs.length > 0) {
            console.error(`⚠️ Found ${malformedPairs.length} malformed pairs:`, malformedPairs);
          }
        }
        
        setPairings(prev => {
          console.log(`Setting pairings for lane ${lane.id}, pairs:`, pairs);
          return { ...prev, [lane.id]: pairs };
        });
        
        setLaneStats(prev => ({ ...prev, [lane.id]: {
          totalCityPairs: result.totalCityPairs || pairs.length || 0,
          uniqueOriginKmas: result.uniqueOriginKmas || 0,
          uniqueDestKmas: result.uniqueDestKmas || 0
        }}));
        setGeneratedLaneId(lane.id);
        setGeneratedEquipmentCode(lane.equipment_code || lane.equipmentCode);
        setShowPairings(true);
        
        // Only generate RR number after pairings finalized
        const rrResponse = await fetch('/api/rr-number');
        const rrResult = await rrResponse.json();
        const rr = rrResult.success ? rrResult.rrNumber : 'RR00000';
        setRRNumbers(prev => ({ ...prev, [lane.id]: rr }));
        
        setAlert({ type: 'success', message: `Pairings generated for lane ${lane.id}` });
      } catch (error) {
        console.error(`❌ [${requestId}] API error:`, error);
        
        // Check if it's an authentication error
        if ((error.message && error.message.includes('401')) || 
            (error.status === 401 || error.statusCode === 401)) {
          setAlert({ type: 'error', message: 'Authentication failed - please log in again' });
        } else {
          // Handle general errors
          const errorMsg = error.message || error.error || 'Unknown error';
          setAlert({ type: 'error', message: `Failed to generate pairings: ${errorMsg}` });
        }
        
        setPairings(prev => ({ ...prev, [lane.id]: [] }));
      }
    } catch (error) {
      setAlert({ type: 'error', message: String(error?.message || error || 'Failed to generate pairings') });
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
      // Log detailed information about each lane's fields
      console.log(`🔍 Validating lane ID ${lane.id}:`, {
        // Values and types to diagnose any serialization/undefined issues
        origin_city: {
          value: lane.origin_city,
          type: typeof lane.origin_city,
          exists: lane.hasOwnProperty('origin_city')
        },
        originCity: {
          value: lane.originCity, 
          type: typeof lane.originCity,
          exists: lane.hasOwnProperty('originCity')
        },
        destination_city: {
          value: lane.destination_city,
          type: typeof lane.destination_city,
          exists: lane.hasOwnProperty('destination_city')
        },
        destinationCity: {
          value: lane.destinationCity,
          type: typeof lane.destinationCity,
          exists: lane.hasOwnProperty('destinationCity')
        }
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
          
          // Create auth session object with the token
          // CRITICAL FIX: This is the key change that ensures token is passed
          const authSession = token ? { access_token: token } : null;
          
          // Debug log the auth token being used
          console.log(`🔑 Using auth token for lane ${lane.id}:`, {
            hasToken: !!token,
            tokenStart: token ? token.substring(0, 10) + '...' : 'none',
            expiresAt: authTokenInfo?.expiresAt || 'unknown'
          });
          
          // Use the safe API adapter to avoid React Error #130
          try {
            const result = await safeCallIntelligencePairingApi(
              lane,
              { useTestMode: false, debug: debugMode },
              authSession
            );
            // Unified classification logic (mirrors test-integration-batch.js):
            // 1. error if result.error present
            // 2. success if pairs length > 0
            // 3. skipped otherwise (pairs = 0, no error)
            const pairs = Array.isArray(result.pairs) ? result.pairs : [];
            let classification = result.error ? 'error' : (pairs.length > 0 ? 'success' : 'skipped');
            let warning;
            if (result.status === 422 || result.statusCode === 422) {
              classification = 'skipped';
              warning = result.error || 'Diversity requirement not met';
            }
            const stats = {
              totalCityPairs: result.totalCityPairs || pairs.length || 0,
              uniqueOriginKmas: result.uniqueOriginKmas || 0,
              uniqueDestKmas: result.uniqueDestKmas || 0
            };
            if (classification === 'error') {
              return { laneId: lane.id, pairs: [], error: result.error, classification, stats, warning };
            }
            if (classification === 'success') {
              // Only fetch RR number when we have successful pairs
              const rrResp = await fetch('/api/rr-number');
              const rrJson = await rrResp.json();
              const rr = rrJson.success ? rrJson.rrNumber : 'RR00000';
              return { laneId: lane.id, pairs, rr, classification, stats };
            }
            // skipped
            return { laneId: lane.id, pairs: [], classification, stats, warning };
          } catch (apiErr) {
            console.error(`❌ [${requestId}] API error:`, apiErr);
            if (apiErr.message && apiErr.message.includes('401')) {
              return { laneId: lane.id, error: 'Authentication failed', stop: true, classification: 'error' };
            }
            return { laneId: lane.id, error: apiErr.message || 'API error', classification: 'error' };
          }
          
          // (Removed legacy branching for KMA diversity & city lookup; classification handled above)
        } catch (error) {
          console.error(`❌ Error processing lane ${lane.id}:`, error);
          return { 
            laneId: lane.id,
            error: error.message || 'Unknown error',
            pairs: [],
            classification: 'error'
          };
        }
      });
      
      // Wait for all lanes in this batch to complete
      const results = await Promise.all(batchPromises);
      
      // Process results
      for (const r of results) {
        const classification = r.classification || (r.error ? 'error' : (r.pairs && r.pairs.length > 0 ? 'success' : 'skipped'));
        if (classification === 'success') {
          successCount++;
          newPairings[r.laneId] = r.pairs;
          if (r.rr) newRRs[r.laneId] = r.rr;
          if (r.stats) setLaneStats(prev => ({ ...prev, [r.laneId]: r.stats }));
        } else if (classification === 'error') {
          errorCount++;
          newPairings[r.laneId] = [];
          if (r.stop) {
            console.error('🛑 Authentication stop triggered – aborting remaining lanes');
            setAlert({ type: 'error', message: 'Authentication failed - please log in again' });
            setPairings(newPairings);
            setRRNumbers(newRRs);
            setGeneratingPairings(false);
            return;
          }
          if (r.stats) setLaneStats(prev => ({ ...prev, [r.laneId]: r.stats }));
          if (r.warning) setLaneWarnings(prev => ({ ...prev, [r.laneId]: r.warning }));
        } else {
          skipCount++;
          newPairings[r.laneId] = [];
          if (r.stats) setLaneStats(prev => ({ ...prev, [r.laneId]: r.stats }));
          if (r.warning) setLaneWarnings(prev => ({ ...prev, [r.laneId]: r.warning }));
        }
        // Standardized per-lane outcome log (mirrors harness)
        console.log(`[BATCH] Lane ${r.laneId} outcome: ${classification} (pairs=${r.pairs?.length || 0}${r.error ? ', error=' + r.error : ''})`);
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
      setAlert({ type: 'success', message: `Pairings generated for all ${successCount} lanes successfully.` });
    } else if (errorCount === 0 && skipCount > 0) {
      setAlert({ type: 'warning', message: `Completed: ${successCount} success, ${skipCount} skipped (no pairs), 0 errors.` });
    } else {
      setAlert({ type: 'warning', message: `Completed: ${successCount} success, ${skipCount} skipped, ${errorCount} errors.` });
    }
  };

  const generateReferenceId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RR${timestamp}${random}`;
  };

  // Toggle pair selection
  const togglePairSelection = (laneId, pairIndex) => {
    console.log(`Toggling selection for lane ${laneId}, pair ${pairIndex}`);
    setSelectedPairs(prev => {
      try {
        const current = prev[laneId] || [];
        const isSelected = current.includes(pairIndex);
        
        if (isSelected) {
          // Remove from selection
          console.log(`Deselecting lane ${laneId}, pair ${pairIndex}`);
          return {
            ...prev,
            [laneId]: current.filter(i => i !== pairIndex)
          };
        } else {
          // Add to selection
          console.log(`Selecting lane ${laneId}, pair ${pairIndex}`);
          return {
            ...prev,
            [laneId]: [...current, pairIndex]
          };
        }
      } catch (error) {
        console.error('Error updating selection:', error);
        return prev;
      }
    });
  };

  // Select/deselect all pairs for a lane
  const toggleAllPairs = (laneId) => {
    console.log(`Toggle all pairs for lane ${laneId}`);
    const lanePairings = pairings[laneId] || [];
    const currentSelection = selectedPairs[laneId] || [];
    console.log(`Current selection: ${currentSelection.length}/${lanePairings.length} pairs`);
    
    if (currentSelection.length === lanePairings.length) {
      // All selected, deselect all
      console.log('Deselecting all pairs');
      setSelectedPairs(prev => {
        const newState = { ...prev, [laneId]: [] };
        console.log('New selection state:', newState);
        return newState;
      });
    } else {
      // Select all
      console.log('Selecting all pairs');
      setSelectedPairs(prev => {
        const indices = lanePairings.map((_, idx) => idx);
        console.log(`Generated indices:`, indices);
        const newState = { ...prev, [laneId]: indices };
        console.log('New selection state:', newState);
        return newState;
      });
    }
  };

  // Save selected cities to database
  const saveCitiesToDatabase = async () => {
    setSavingCities(true);
    setAlert(null);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.access_token) throw new Error('Authentication required');

      let savedCount = 0;
      let errorCount = 0;

      // Process each lane with selections
      for (const laneId in selectedPairs) {
        const selectedIndices = selectedPairs[laneId] || [];
        if (selectedIndices.length === 0) continue;

        const lanePairings = pairings[laneId];
        if (!lanePairings) continue;

        // Extract selected origin and destination cities
        const originCities = [];
        const destCities = [];

        selectedIndices.forEach(idx => {
          const pair = lanePairings[idx];
          if (!pair) return;

          const originCity = {
            city: pair.origin.city,
            state: pair.origin.state,
            zip: pair.origin.zip,
            kma: pair.origin.kma
          };
          const destCity = {
            city: pair.destination.city,
            state: pair.destination.state,
            zip: pair.destination.zip,
            kma: pair.destination.kma
          };

          // Add unique origins and destinations
          if (!originCities.find(c => c.city === originCity.city && c.state === originCity.state)) {
            originCities.push(originCity);
          }
          if (!destCities.find(c => c.city === destCity.city && c.state === destCity.state)) {
            destCities.push(destCity);
          }
        });

        // Update lane with saved cities
        const { error } = await supabase
          .from('lanes')
          .update({
            saved_origin_cities: originCities,
            saved_dest_cities: destCities,
            lane_status: 'current' // Keep as current when cities are saved
          })
          .eq('id', laneId);

        if (error) {
          console.error(`Failed to save cities for lane ${laneId}:`, error);
          errorCount++;
        } else {
          savedCount++;
        }
      }

      if (savedCount > 0) {
        setAlert({ 
          type: 'success', 
          message: `✅ Successfully saved city selections for ${savedCount} lane(s)!` 
        });
        
        // Clear selections after save
        setSelectedPairs({});
        
        // Refresh lanes
        await fetchPendingLanes();
      } else {
        setAlert({ 
          type: 'warning', 
          message: '⚠️ No city pairs selected. Please check the pairs you want to use.' 
        });
      }

      if (errorCount > 0) {
        setAlert({ 
          type: 'error', 
          message: `❌ Failed to save ${errorCount} lane(s)` 
        });
      }

    } catch (error) {
      console.error('Save cities error:', error);
      setAlert({ 
        type: 'error', 
        message: `❌ Error: ${error.message}` 
      });
    } finally {
      setSavingCities(false);
    }
  };

  const formatLaneCard = (lane) => {
    const originZip = lane.origin_zip ? `, ${lane.origin_zip}` : '';
    const destZip = lane.dest_zip || lane.destination_zip ? `, ${lane.dest_zip || lane.destination_zip}` : '';
    const destCity = lane.dest_city || lane.destination_city || 'Unknown';
    const destState = lane.dest_state || lane.destination_state || '??';
    const rr = rrNumbers[lane.id] || 'RR#####';
    return `${lane.origin_city}, ${lane.origin_state}${originZip} → ${destCity}, ${destState}${destZip} | ${lane.equipment_code} | ${rr}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setAlert({ type: 'success', message: 'Copied to clipboard.' });
    }).catch(err => {
      setAlert({ type: 'error', message: 'Failed to copy.' });
    });
  };

  // Generate posting options for a single lane via manual endpoint
  const handleGenerateOptions = async (lane) => {
    if (!lane) return;
    try {
      // Attempt coordinate resolution if any origin/dest coords are missing
      if (!lane.origin_latitude || !lane.origin_longitude || !lane.dest_latitude || !lane.dest_longitude) {
        try {
          const coordRes = await fetch(`/api/resolve-coords?origin_zip=${lane.origin_zip || ''}&dest_zip=${lane.dest_zip || ''}`);
          if (coordRes.ok) {
            const { origin_latitude, origin_longitude, dest_latitude, dest_longitude } = await coordRes.json();
            lane.origin_latitude = origin_latitude;
            lane.origin_longitude = origin_longitude;
            lane.dest_latitude = dest_latitude;
            lane.dest_longitude = dest_longitude;
          } else {
            console.warn('Skipping lane due to missing coords', lane.id);
            return;
          }
        } catch (e) {
          console.error('Failed to resolve coords', e);
          return;
        }
      }

      console.log('🚀 Generating options for lane', lane.id);
      const res = await fetch('/api/post-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lane })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to generate options: ${text}`);
      }
      const data = await res.json();
      console.log('✅ Options generated', data);
    } catch (err) {
      console.error(err);
    }
  };

  // Batch generate for all lanes currently loaded (pending set)
  const handleGenerateAllOptions = async () => {
    console.log('🚀 Generate All Options clicked, total lanes:', lanes.length);
    for (const lane of lanes) {
      // eslint-disable-next-line no-await-in-loop
      await handleGenerateOptions(lane);
    }
  };

  if (loading) {
    console.log('[TRACE] PostOptions loading return - before rendering');
    const renderedValue = (
      <>
        <ErrorBoundary componentName="Header">
          <Header />
        </ErrorBoundary>
        <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <div style={{ color: 'var(--text-tertiary)' }}>Loading pending lanes...</div>
              {/* Diagnostic component removed to fix build */}
            </div>
          </div>
        </div>
      </>
    );
    console.log('[TRACE] PostOptions loading state', typeof renderedValue, typeof renderedValue === 'object' ? 'Object (valid JSX)' : 'Not an object');
    return renderedValue;
  }

  // Add runtime tracing to debug React Error #130
  console.log('[TRACE] PostOptions render - about to return JSX');
  console.log('[TRACE] Header component type:', typeof Header);
  console.log('[TRACE] Header component stringified:', typeof Header === 'object' ? JSON.stringify(Header) : 'Not an object');
  
  const returnJsx = (
    <>
      <Head>
        <title>Post Options - RapidRoutes</title>
        <script src="/error-capture.js"></script>
        <script src="/trace-helper.js"></script>
      </Head>
      <ErrorBoundary componentName="Header">
        <Header />
      </ErrorBoundary>
      <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="container mx-auto px-4 py-8">
          {/* Diagnostic component removed to fix build */}
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Post Options</h1>
              <p className="mt-2" style={{ color: 'var(--text-tertiary)' }}>Manual posting workflow for {lanes.length} pending lanes</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/lanes')}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium"
              >
                ← Back to Lanes
              </button>
              <button
                onClick={handleGenerateAllOptions}
                disabled={lanes.length === 0}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
              >
                ⚙ Load All Options ({lanes.length})
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
              <button
                onClick={saveCitiesToDatabase}
                disabled={savingCities || Object.keys(selectedPairs).filter(k => selectedPairs[k]?.length > 0).length === 0}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
              >
                {savingCities 
                  ? '💾 Saving...' 
                  : `💾 Save Cities (${Object.keys(selectedPairs).filter(k => selectedPairs[k]?.length > 0).length})`
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
                        setAlert({ type: 'error', message: `Auth flow test failed: ${String(result.error || 'Unknown error')}` });
                      }
                    } catch (error) {
                      setAlert({ type: 'error', message: `Auth test error: ${String(error?.message || error || 'Unknown error')}` });
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
            <div className={`mb-6 px-4 py-3 rounded-lg font-medium text-sm ${
              alert.type === 'success' ? 'bg-green-900 text-green-200 border border-green-700' :
              alert.type === 'warning' ? 'bg-yellow-900 text-yellow-200 border border-yellow-700' :
              'bg-red-900 text-red-200 border border-red-700'
            }`}>{String(alert.message || 'An error occurred')}</div>
          )}

          {debugMode && lanes.length > 0 && (
            <div className="mb-8 rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Debug Overlay</h2>
                <span className="text-xs text-gray-400">{lanes.length} lanes</span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto text-xs font-mono">
                {lanes.map(l => {
                  const stats = laneStats[l.id];
                  const warning = laneWarnings[l.id];
                  const pairs = pairings[l.id];
                  const pairCount = Array.isArray(pairs) ? pairs.length : 0;
                  return (
                    <div key={l.id} className="rounded p-3" style={{ background: 'var(--bg-tertiary)', border: 'var(--border)' }}>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: 'var(--text-secondary)' }}>Lane {l.id}</span>
                        <span className="truncate ml-2" style={{ color: 'var(--text-tertiary)' }}>
                          {l.origin_city ?? '?'},{l.origin_state ?? '?'}→{l.dest_city ?? l.destination_city ?? '?'},{l.dest_state ?? l.destination_state ?? '?'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <span>Pairs:{pairCount}</span>
                        {stats && (
                          <>
                            <span>T:{stats.totalCityPairs || 0}</span>
                            <span>O:{stats.uniqueOriginKmas || 0}</span>
                            <span>D:{stats.uniqueDestKmas || 0}</span>
                          </>
                        )}
                        {warning && <span className="text-yellow-400">⚠ {typeof warning === 'object' ? JSON.stringify(warning) : warning}</span>}
                        {pairCount === 0 && !warning && <span className="text-red-400">Ø no pairs</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-xs text-gray-500">Debug mode enabled (append ?debug=1 to URL)</div>
            </div>
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
            <ErrorBoundary componentName="AllLanesContainer">
              <div className="space-y-6">
                {lanes.map((lane) => {
                console.log(`Rendering lane ${lane.id}:`, typeof lane, lane);
                const laneCard = (
                  <ErrorBoundary key={lane.id} componentName={`LaneCard-${lane.id}`}>
                    <div className="rounded-lg p-6" style={{ background: 'var(--bg-secondary)', border: 'var(--border)' }}>
                  {/* Lane Card Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div 
                      className="p-4 rounded-lg font-mono text-sm cursor-pointer transition-colors"
                      style={{ 
                        background: 'var(--bg-tertiary)', 
                        color: 'var(--text-primary)'
                      }}
                      onClick={() => copyToClipboard(formatLaneCard(lane))}
                      title="Click to copy lane card"
                    >
                      {formatLaneCard(lane)}
                    </div>
                    <ErrorBoundary componentName={`GeneratePairingsBtn-${lane.id}`}>
                      <button
                        onClick={() => generatePairingsForLane(lane)}
                        disabled={generatingPairings}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm ml-4"
                      >
                        {generatingPairings ? '🔄' : '🎯'} Generate Pairings
                      </button>
                    </ErrorBoundary>
                  </div>
                  {/* City Pairings */}
                  {Array.isArray(pairings[lane.id]) && (
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                          City Pairings ({pairings[lane.id].length})
                          {selectedPairs[lane.id]?.length > 0 && (
                            <span className="ml-2 text-sm text-green-400">
                              ({selectedPairs[lane.id].length} selected)
                            </span>
                          )}
                        </h3>
                        {pairings[lane.id].length > 0 && (
                          <ErrorBoundary componentName={`ToggleAllBtn-${lane.id}`}>
                            <button
                              onClick={() => toggleAllPairs(lane.id)}
                              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                            >
                              {(selectedPairs[lane.id]?.length || 0) === pairings[lane.id].length 
                                ? 'Deselect All' 
                                : 'Select All'}
                            </button>
                          </ErrorBoundary>
                        )}
                      </div>
                      {Array.isArray(pairings[lane.id]) && pairings[lane.id].length === 0 ? (
                        <div className="bg-red-900 text-red-200 border border-red-700 p-3 rounded-lg">
                          No city pairings generated. Intelligence system may need attention.
                        </div>
                      ) : (
                        <ErrorBoundary componentName={`PairingsList-${lane.id}`}>
                          <div className="grid gap-2 max-h-96 overflow-y-auto">
                            {Array.isArray(pairings[lane.id]) ? pairings[lane.id].map((pair, index) => {
                            console.log(`Rendering pair ${index} for lane ${lane.id}:`, typeof pair, pair);
                            
                            // Protect against malformed data
                            if (!pair || typeof pair !== 'object') {
                              console.log(`Skipping pair ${index} due to invalid type:`, typeof pair);
                              return (
                                <div key={index} className="bg-red-900 text-red-200 border border-red-700 p-3 rounded text-sm">
                                  ⚠️ Invalid pair data (not an object): {JSON.stringify(pair)}
                                </div>
                              );
                            }
                            
                            if (!pair.origin || !pair.destination) {
                              console.log(`Skipping pair ${index} due to incomplete data`);
                              return (
                                <div key={index} className="bg-yellow-900 text-yellow-200 border border-yellow-700 p-3 rounded text-sm">
                                  ⚠️ Pair skipped due to incomplete data (missing origin/destination)
                                </div>
                              );
                            }
                            
                            // Additional check for invalid origin/destination structure
                            if (typeof pair.origin !== 'object' || typeof pair.destination !== 'object') {
                              console.log(`Skipping pair ${index} due to invalid origin/destination structure:`, { 
                                originType: typeof pair.origin, 
                                destType: typeof pair.destination 
                              });
                              return (
                                <div key={index} className="bg-orange-900 text-orange-200 border border-orange-700 p-3 rounded text-sm">
                                  ⚠️ Invalid origin/destination structure
                                </div>
                              );
                            }
                            
                            console.log(`Origin data for pair ${index}:`, typeof pair.origin, pair.origin);
                            console.log(`Destination data for pair ${index}:`, typeof pair.destination, pair.destination);
                            
                            // Safely access properties with defensive checks
                            const origin = typeof pair.origin === 'object' ? pair.origin : {};
                            const destination = typeof pair.destination === 'object' ? pair.destination : {};
                            
                            const originCity = origin.city || 'Unknown';
                            const originState = origin.state || 'Unknown';
                            const originZip = origin.zip ? `, ${origin.zip}` : '';
                            const destCity = destination.city || 'Unknown';
                            const destState = destination.state || 'Unknown';
                            const destZip = destination.zip ? `, ${destination.zip}` : '';
                            
                            const pairText = `${originCity}, ${originState}${originZip} → ${destCity}, ${destState}${destZip}`;
                            const isSelected = selectedPairs[lane.id]?.includes(index) || false;
                            
                            const returnElement = (
                              <div 
                                key={index} 
                                className={`flex items-center gap-3 p-3 rounded text-sm font-mono cursor-pointer transition-all ${
                                  isSelected ? 'ring-2 ring-blue-500' : ''
                                }`}
                                style={{ background: isSelected ? 'var(--primary-light)' : 'var(--bg-tertiary)' }}
                                onClick={() => togglePairSelection(lane.id, index)}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => togglePairSelection(lane.id, index)}
                                  className="w-4 h-4 cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="flex-1" style={{ color: 'var(--text-primary)' }}>
                                  {pairText}
                                  {origin?.kma && destination?.kma && (
                                    <span className="ml-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                      ({origin.kma} → {destination.kma})
                                    </span>
                                  )}
                                  {/* Debug mileage display */}
                                  {typeof pair.miles === 'number' && (
                                    <span className="ml-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                      {pair.miles} mi
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(pairText);
                                  }}
                                  className="ml-3 px-2 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs"
                                  title="Copy pairing to clipboard"
                                >
                                  Copy
                                </button>
                              </div>
                            );
                            console.log(`Return value for pair ${index}:`, typeof returnElement, returnElement);
                            return returnElement;
                            }) : <div className="p-3 bg-red-900 text-red-100 rounded">No valid pairings array found</div>}
                          </div>
                        </ErrorBoundary>
                      )}
                      {debugMode && laneStats[lane.id] && (
                        <div className="mt-4 rounded p-3 text-xs font-mono" style={{ background: 'var(--bg-tertiary)', border: 'var(--border)', color: 'var(--text-secondary)' }}>
                          <div className="flex gap-4 flex-wrap">
                            <span>Total Pairs: {laneStats[lane.id].totalCityPairs || 0}</span>
                            <span>Origin KMAs: {laneStats[lane.id].uniqueOriginKmas || 0}</span>
                            <span>Dest KMAs: {laneStats[lane.id].uniqueDestKmas || 0}</span>
                            {laneWarnings[lane.id] && (
                              <span className="text-yellow-400">⚠ {typeof laneWarnings[lane.id] === 'object' ? JSON.stringify(laneWarnings[lane.id]) : laneWarnings[lane.id]}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </ErrorBoundary>
                );
                console.log(`Return value for lane ${lane.id}:`, typeof laneCard, laneCard);
                return laneCard;
              })}
            </div>
            </ErrorBoundary>
          )}
        </div>
      </div>
    </>
  );
  
  console.log('[TRACE] PostOptions return value type:', typeof returnJsx);
  console.log('[TRACE] PostOptions return value:', 
    typeof returnJsx === 'object' ? 'Object (valid JSX)' : 'Not an object');
  
  return returnJsx;
}
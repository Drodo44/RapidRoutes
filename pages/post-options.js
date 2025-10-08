import React, { useState } from "react";
import Header from "../components/Header";
import { useLanes } from "../components/post-options/LaneFetcher";
import LaneList from "../components/post-options/LaneList";
import { generateOptions } from "../components/post-options/OptionsGenerator";
import { OptionsPayloadSchema } from "../components/post-options/ZodValidation";
import { useToast } from "../components/post-options/Toast";

/**
 * Post Options page for generating lane options
 */
export default function PostOptions() {
  // Use our custom hook to fetch lanes
  const { lanes, loading, error, refetch } = useLanes({
    limit: 50,
    currentOnly: true,
    orderBy: 'created_at',
    ascending: false
  });

  // State for tracking options generation
  const [processing, setProcessing] = useState(false);
  
  // Use our custom toast hook
  const { showToast, hideToast, ToastComponent } = useToast();
  
  // Handler for generating options
  const handleGenerateOptions = async (lane) => {
    setProcessing(true);
    
    // Success callback
    const onSuccess = (data) => {
      showToast({
        message: `Options generated for ${lane.origin_city} → ${lane.destination_city || lane.dest_city}`,
        type: 'success',
      });
      setProcessing(false);
    };
    
    // Error callback
    const onError = (error) => {
      showToast({
        message: `Error: ${error.message}`,
        type: 'error',
        duration: 6000
      });
      setProcessing(false);
    };
    
    // Call the options generator with our schema
    await generateOptions(lane, onSuccess, onError, OptionsPayloadSchema);
  };
  
  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen">
      <Header />
      
      <main className="container mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-6">Post Options</h1>
        
        {/* Toast notifications */}
        {ToastComponent}
        
        {/* Action buttons */}
        <div className="flex justify-end mb-4">
          <button
            onClick={refetch}
            disabled={loading || processing}
            className={`px-4 py-2 ${
              loading || processing
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
            } rounded`}
          >
            {loading ? 'Loading...' : 'Refresh Lanes'}
          </button>
        </div>
        
        {/* Error display from useLanes */}
        {error && (
          <div className="p-4 bg-red-900 text-red-100 border border-red-700 rounded mb-4">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {/* Lane list component */}
        <LaneList 
          lanes={lanes} 
          loading={loading}
          onGenerateOptions={handleGenerateOptions}
        />
      </main>
    </div>
  );
}
import React, { useState } from "react";
import Header from "../components/Header";
import { useLanes } from "../components/post-options/LaneFetcher";
import LaneList from "../components/post-options/LaneList";
import { generateOptions, generateOptionsBatch } from "../components/post-options/OptionsGenerator";
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
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isBatchMode, setIsBatchMode] = useState(false);
  
  // Use our custom toast hook
  const { showToast, hideToast, ToastComponent } = useToast();
  
  // Handler for generating options for a single lane
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
  
  // Handler for batch generating options for all lanes
  const handleBatchGenerate = async () => {
    if (!lanes.length) {
      showToast({
        message: "No lanes available for batch processing",
        type: "warning"
      });
      return;
    }
    
    setIsBatchMode(true);
    setProcessing(true);
    setProgress({ current: 0, total: lanes.length });
    
    // Progress callback
    const onProgress = (index, total, result) => {
      setProgress({ current: index + 1, total });
      
      const lane = lanes[index];
      const message = result.success
        ? `(${index+1}/${total}) Generated options for ${lane.origin_city} → ${lane.destination_city || lane.dest_city}`
        : `(${index+1}/${total}) Failed for ${lane.origin_city} → ${lane.destination_city || lane.dest_city}`;
        
      showToast({
        message,
        type: result.success ? "success" : "error",
        duration: 3000
      });
    };
    
    // Completion callback
    const onComplete = (result) => {
      setProcessing(false);
      setIsBatchMode(false);
      
      showToast({
        message: `Batch processing complete: ${result.successCount}/${result.totalCount} successful`,
        type: result.success ? "success" : "warning",
        duration: 6000
      });
      
      // Refresh lanes to get updated data
      refetch();
    };
    
    // Start batch processing
    await generateOptionsBatch(lanes, {
      parallel: false,
      onProgress,
      onComplete
    });
  };
  
  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen">
      <Header />
      
      <main className="container mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-6">Post Options</h1>
        
        {/* Toast notifications */}
        {ToastComponent}
        
        {/* Action buttons */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleBatchGenerate}
              disabled={loading || processing || !lanes.length}
              className={`px-4 py-2 ${
                loading || processing || !lanes.length
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
              } rounded`}
            >
              {processing && isBatchMode
                ? `Processing ${progress.current}/${progress.total}`
                : 'Generate All Options'}
            </button>
          </div>
          
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
        
        {/* Progress bar for batch processing */}
        {processing && isBatchMode && (
          <div className="w-full h-2 bg-gray-700 rounded-full mb-4 overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ 
                width: `${Math.round((progress.current / progress.total) * 100)}%` 
              }}
            />
          </div>
        )}
        
        {/* Lane list component */}
        <LaneList 
          lanes={lanes} 
          loading={loading}
          processing={processing}
          onGenerateOptions={handleGenerateOptions}
        />
      </main>
    </div>
  );
}
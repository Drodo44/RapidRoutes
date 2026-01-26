// components/IntermodalNudge.js
import { useState, useEffect } from "react";
import { checkIntermodalEligibility } from "../lib/intermodalAdvisor";

export default function IntermodalNudge({ lane, onClose, onEmail }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  useEffect(() => {
    async function analyzeLane() {
      if (lane) {
        try {
          const result = await checkIntermodalEligibility(lane);
          setAnalysis(result);
        } catch (error) {
          console.error('Error analyzing lane:', error);
          setAnalysis({ eligible: false, reason: 'Analysis failed' });
        } finally {
          setLoading(false);
        }
      }
    }
    analyzeLane();
  }, [lane]);

  const getScoreColor = (score) => {
    if (score >= 70) return "text-green-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreText = (score) => {
    if (score >= 70) return "Excellent";
    if (score >= 50) return "Good";
    return "Poor";
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
        <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-blue-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Analyzing intermodal potential...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-2xl max-w-2xl w-full border border-blue-500 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-blue-400 mb-2">
            🚄 Intermodal Analysis
          </h2>
          <p className="text-lg font-semibold">
            {lane.origin_city || '?'}, {lane.origin_state || '?'} → {lane.dest_city || '?'}, {lane.dest_state || '?'}
          </p>
        </div>

        {analysis?.eligible ? (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">✅</div>
              <h3 className="text-xl font-bold text-green-400 mb-2">Strong Intermodal Candidate</h3>
              <p className="text-green-300">
                Score: <span className={`font-bold ${getScoreColor(analysis.score)}`}>
                  {analysis.score}/100 ({getScoreText(analysis.score)})
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className={`p-3 rounded ${analysis.factors.distance.suitable ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'} border`}>
                <div className="font-semibold mb-1">
                  {analysis.factors.distance.suitable ? '✅' : '❌'} Distance
                </div>
                <div className="text-gray-300">{analysis.factors.distance.miles} miles</div>
              </div>

              <div className={`p-3 rounded ${analysis.factors.weight.suitable ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'} border`}>
                <div className="font-semibold mb-1">
                  {analysis.factors.weight.suitable ? '✅' : '❌'} Weight
                </div>
                <div className="text-gray-300">{analysis.factors.weight.lbs.toLocaleString()} lbs</div>
              </div>

              <div className={`p-3 rounded ${analysis.factors.equipment.compatible ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'} border`}>
                <div className="font-semibold mb-1">
                  {analysis.factors.equipment.compatible ? '✅' : '❌'} Equipment
                </div>
                <div className="text-gray-300">{analysis.factors.equipment.type}</div>
              </div>

              <div className={`p-3 rounded ${!analysis.factors.timing.urgent ? 'bg-green-900/30 border-green-700' : 'bg-yellow-900/30 border-yellow-700'} border`}>
                <div className="font-semibold mb-1">
                  {!analysis.factors.timing.urgent ? '✅' : '⚠️'} Timing
                </div>
                <div className="text-gray-300">{analysis.factors.timing.urgent ? 'Urgent' : 'Standard'}</div>
              </div>
            </div>

            {analysis.estimatedSavings && (
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                <h4 className="font-semibold text-blue-400 mb-2">💰 Estimated Savings</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Truck Rate</div>
                    <div className="font-semibold">${analysis.estimatedSavings.truckRate.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Rail Rate</div>
                    <div className="font-semibold text-green-400">${analysis.estimatedSavings.railRate.toLocaleString()}</div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-blue-600">
                    <div className="text-gray-400">Potential Savings</div>
                    <div className="font-bold text-green-400 text-lg">
                      ${analysis.estimatedSavings.savings.toLocaleString()} ({analysis.estimatedSavings.percentage})
                    </div>
                  </div>
                </div>
              </div>
            )}

            {analysis.transitTime && (
              <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
                <h4 className="font-semibold text-purple-400 mb-2">⏱️ Transit Time Comparison</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Truck</div>
                    <div className="font-semibold">{analysis.transitTime.truck}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Rail</div>
                    <div className="font-semibold">{analysis.transitTime.rail}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-gray-300 mb-2">📋 Recommendations</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">❌</div>
              <h3 className="text-xl font-bold text-red-400 mb-2">Not Suitable for Intermodal</h3>
              <p className="text-red-300">{analysis?.reason || 'Lane does not meet intermodal criteria'}</p>
            </div>

            {analysis?.factors && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className={`p-3 rounded ${analysis.factors.distance?.suitable ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'} border`}>
                  <div className="font-semibold mb-1">
                    {analysis.factors.distance?.suitable ? '✅' : '❌'} Distance
                  </div>
                  <div className="text-gray-300">{analysis.factors.distance?.miles || 'Unknown'} miles</div>
                </div>

                <div className={`p-3 rounded ${analysis.factors.weight?.suitable ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'} border`}>
                  <div className="font-semibold mb-1">
                    {analysis.factors.weight?.suitable ? '✅' : '❌'} Weight
                  </div>
                  <div className="text-gray-300">{analysis.factors.weight?.lbs?.toLocaleString() || 'Unknown'} lbs</div>
                </div>

                <div className={`p-3 rounded ${analysis.factors.equipment?.compatible ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'} border`}>
                  <div className="font-semibold mb-1">
                    {analysis.factors.equipment?.compatible ? '✅' : '❌'} Equipment
                  </div>
                  <div className="text-gray-300">{analysis.factors.equipment?.type || 'Unknown'}</div>
                </div>

                <div className={`p-3 rounded ${!analysis.factors.timing?.urgent ? 'bg-green-900/30 border-green-700' : 'bg-yellow-900/30 border-yellow-700'} border`}>
                  <div className="font-semibold mb-1">
                    {!analysis.factors.timing?.urgent ? '✅' : '⚠️'} Timing
                  </div>
                  <div className="text-gray-300">{analysis.factors.timing?.urgent ? 'Urgent' : 'Standard'}</div>
                </div>
              </div>
            )}

            {analysis?.recommendations && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-300 mb-2">📋 Recommendations</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-xl text-white font-semibold"
          >
            {analysis?.eligible ? 'Continue with Truck' : 'Understood'}
          </button>
          {analysis?.eligible && (
            <button
              onClick={() => onEmail(lane, analysis)}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-xl text-white font-semibold"
            >
              Generate Intermodal Quote Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


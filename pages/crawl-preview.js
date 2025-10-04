// pages/crawl-preview.js
// Proper formatted preview page for lane crawl data

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function CrawlPreviewPage() {
  const router = useRouter();
  const [crawlData, setCrawlData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { origin, dest, equip, fill } = router.query;

  useEffect(() => {
    if (!origin || !dest || !equip) return;

    async function fetchPreview() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          origin,
          dest,
          equip,
          fill: fill || '0'
        });
        
        const response = await fetch(`/api/debugCrawl?${params}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch preview: ${response.status}`);
        }
        
        const data = await response.json();
        setCrawlData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPreview();
  }, [origin, dest, equip, fill]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Generating intelligent freight crawl...</p>
          <p className="text-sm text-gray-400 mt-2">Equipment-based targeting with KMA diversity</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="text-center text-red-400">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-2">Preview Error</h1>
          <p className="mb-4">{error}</p>
          <button 
            onClick={() => window.close()} 
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  const totalPostings = crawlData.count + 1; // +1 for base lane
  const totalRows = totalPostings * 2; // 2 contact methods per posting

  return (
    <>
      <Head>
        <title>Lane Preview - RapidRoutes</title>
      </Head>
      
      <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="border-b border-gray-700 pb-6 mb-6">
            <h1 className="text-3xl font-bold text-blue-400 mb-2">🚀 Intelligent Freight Preview</h1>
            <p className="text-gray-400">Equipment-based crawl generation with KMA diversity and freight intelligence</p>
          </div>

          {/* Lane Summary Card */}
          <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-6 mb-6 border border-blue-500">
            <h2 className="text-xl font-semibold mb-4 text-white">Lane Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-300">{totalPostings}</div>
                <div className="text-sm text-gray-300">Total Postings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-300">{totalRows}</div>
                <div className="text-sm text-gray-300">CSV Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-300">{equip}</div>
                <div className="text-sm text-gray-300">Equipment</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-300">100%</div>
                <div className="text-sm text-gray-300">Intelligence</div>
              </div>
            </div>
          </div>

          {/* Route Information */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="rounded-lg p-6" style={{ background: 'var(--surface)' }}>
              <h3 className="text-lg font-semibold mb-3 text-green-400">📍 Origin</h3>
              <div className="space-y-2">
                <div className="text-xl font-medium">{crawlData.baseOrigin.city}, {crawlData.baseOrigin.state}</div>
                {crawlData.baseOrigin.zip && (
                  <div className="text-gray-400">ZIP: {crawlData.baseOrigin.zip}</div>
                )}
              </div>
            </div>
            
            <div className="rounded-lg p-6" style={{ background: 'var(--surface)' }}>
              <h3 className="text-lg font-semibold mb-3 text-red-400">🎯 Destination</h3>
              <div className="space-y-2">
                <div className="text-xl font-medium">{crawlData.baseDest.city}, {crawlData.baseDest.state}</div>
                {crawlData.baseDest.zip && (
                  <div className="text-gray-400">ZIP: {crawlData.baseDest.zip}</div>
                )}
              </div>
            </div>
          </div>

          {/* Postings List */}
          <div className="rounded-lg p-6" style={{ background: 'var(--surface)' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-purple-400">🎯 Intelligent Posting Strategy</h2>
              <span className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                {crawlData.count} additional pairs
              </span>
            </div>

            <div className="space-y-4">
              {/* Base Lane - Always First */}
              <div className="bg-gradient-to-r from-green-800 to-green-700 rounded-lg p-4 border-l-4 border-green-400">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">BASE</span>
                    <div>
                      <span className="text-lg font-medium">{crawlData.baseOrigin.city}, {crawlData.baseOrigin.state}</span>
                      <span className="mx-3 text-green-300">→</span>
                      <span className="text-lg font-medium">{crawlData.baseDest.city}, {crawlData.baseDest.state}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-green-200">Primary posting</div>
                    <div className="text-sm text-green-300">2 contact methods</div>
                  </div>
                </div>
              </div>

              {/* Intelligent Crawl Pairs */}
              {crawlData.pairs && crawlData.pairs.length > 0 ? (
                crawlData.pairs.map((pair, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-4 border-l-4 border-blue-400 hover:bg-gray-650 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                          #{index + 1}
                        </span>
                        <div>
                          <span className="text-lg font-medium">{pair.pickup.city}, {pair.pickup.state}</span>
                          <span className="mx-3 text-blue-300">→</span>
                          <span className="text-lg font-medium">{pair.delivery.city}, {pair.delivery.state}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {pair.score && (
                          <div className="text-sm text-blue-200">
                            Intelligence Score: {(pair.score * 100).toFixed(0)}%
                          </div>
                        )}
                        <div className="text-sm text-gray-400">
                          KMA: {pair.pickup.kma_code} → {pair.delivery.kma_code}
                        </div>
                      </div>
                    </div>
                    
                    {pair.reason && pair.reason.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="text-sm text-cyan-400 font-medium mb-1">Freight Intelligence:</div>
                        <div className="text-sm text-gray-300">
                          {pair.reason.map(r => r.replace(/_/g, ' ')).join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-gray-700 rounded-lg border-2 border-dashed border-gray-600">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-xl font-medium text-gray-300 mb-2">Strategic Single-Point Posting</h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    {crawlData.shortfallReason === 'insufficient_unique_kma_or_low_scores' 
                      ? 'Limited high-quality freight markets found within intelligent radius. Your base lane will post with maximum focus and impact.'
                      : 'Base lane optimized for single-point market penetration.'}
                  </p>
                  <div className="mt-4 text-sm text-gray-500">
                    This ensures zero spam and maximum broker attention on your core route.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-center gap-4">
            <button 
              onClick={() => window.close()} 
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              ✅ Looks Good - Close Preview
            </button>
            <button 
              onClick={() => window.print()} 
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              🖨️ Print Preview
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

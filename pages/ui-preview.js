// ============================================================================
// UI PREVIEW PAGE - Visual mockup of new enterprise design
// ============================================================================
// Navigate to: http://localhost:3000/ui-preview
// ============================================================================

import { useState } from 'react';
import Head from 'next/head';

export default function UIPreview() {
  const [activeTab, setActiveTab] = useState('lanes');
  const [selectedOrigins, setSelectedOrigins] = useState(['Tifton, GA', 'Albany, GA']);
  const [selectedDests, setSelectedDests] = useState(['Miami, FL']);

  return (
    <>
      <Head>
        <title>RapidRoutes - Enterprise UI Preview</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        
        {/* Top Navigation Bar */}
        <nav className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  RapidRoutes
                </h1>
                <div className="flex gap-1">
                  {['lanes', 'recap', 'dashboard'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === tab
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">John Broker</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                  JB
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">City Picker</h2>
            <p className="text-gray-400">Select pickup and delivery cities from nearby KMAs</p>
          </div>

          {/* Selection Summary Card */}
          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-sm text-gray-400 mb-2">Origin Cities</div>
                <div className="text-4xl font-bold text-blue-400">{selectedOrigins.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-2">Destination Cities</div>
                <div className="text-4xl font-bold text-cyan-400">{selectedDests.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-2">Total Pairs</div>
                <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  {selectedOrigins.length * selectedDests.length}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-105">
                Save Choices
              </button>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-6">
            
            {/* Origin Cities Column */}
            <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Pickup Cities</h3>
                  <p className="text-sm text-gray-400">From: Fitzgerald, GA</p>
                </div>
              </div>

              {/* KMA Section - Atlanta */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm font-semibold">
                      ATL
                    </span>
                    <span className="text-sm text-gray-400">15 cities</span>
                  </div>
                  <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    Select All
                  </button>
                </div>
                <div className="space-y-2">
                  {['Tifton, GA (22 mi)', 'Cordele, GA (34 mi)', 'Albany, GA (49 mi)', 'Americus, GA (56 mi)'].map((city, i) => (
                    <label key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={i < 2}
                        onChange={() => {}}
                        className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-700 checked:bg-blue-500 checked:border-blue-500 transition-all"
                      />
                      <span className="text-gray-300 group-hover:text-white transition-colors">{city}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* KMA Section - Jacksonville */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400 text-sm font-semibold">
                      JAX
                    </span>
                    <span className="text-sm text-gray-400">8 cities</span>
                  </div>
                  <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                    Select All
                  </button>
                </div>
                <div className="space-y-2">
                  {['Valdosta, GA (56 mi)', 'Lake City, FL (78 mi)'].map((city, i) => (
                    <label key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-700 checked:bg-cyan-500 checked:border-cyan-500 transition-all"
                      />
                      <span className="text-gray-300 group-hover:text-white transition-colors">{city}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Destination Cities Column */}
            <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Delivery Cities</h3>
                  <p className="text-sm text-gray-400">To: Miami, FL</p>
                </div>
              </div>

              {/* KMA Section - Miami */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 text-sm font-semibold">
                      MIA
                    </span>
                    <span className="text-sm text-gray-400">22 cities</span>
                  </div>
                  <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                    Select All
                  </button>
                </div>
                <div className="space-y-2">
                  {['Miami, FL (0 mi)', 'Fort Lauderdale, FL (26 mi)', 'Hollywood, FL (18 mi)', 'Pembroke Pines, FL (15 mi)'].map((city, i) => (
                    <label key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={i === 0}
                        onChange={() => {}}
                        className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-700 checked:bg-purple-500 checked:border-purple-500 transition-all"
                      />
                      <span className="text-gray-300 group-hover:text-white transition-colors">{city}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* KMA Section - Fort Myers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-pink-500/10 border border-pink-500/20 rounded-lg text-pink-400 text-sm font-semibold">
                      FMY
                    </span>
                    <span className="text-sm text-gray-400">6 cities</span>
                  </div>
                  <button className="text-sm text-pink-400 hover:text-pink-300 transition-colors">
                    Select All
                  </button>
                </div>
                <div className="space-y-2">
                  {['Naples, FL (89 mi)', 'Bonita Springs, FL (95 mi)'].map((city, i) => (
                    <label key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-700 checked:bg-pink-500 checked:border-pink-500 transition-all"
                      />
                      <span className="text-gray-300 group-hover:text-white transition-colors">{city}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Design Notes */}
          <div className="mt-12 p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
            <h3 className="text-lg font-bold text-blue-400 mb-3">🎨 Design Philosophy</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span><strong>Glass morphism:</strong> Translucent cards with backdrop blur - modern, premium feel</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span><strong>Color-coded KMAs:</strong> Each market gets a unique accent color for instant recognition</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span><strong>Gradient accents:</strong> Subtle gradients on key elements (not neon, professional)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span><strong>Generous spacing:</strong> Never cramped, easy to scan, comfortable to use all day</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span><strong>Interactive states:</strong> Smooth hover effects, clear visual feedback</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span><strong>Dark theme:</strong> Easy on eyes for all-day use, looks professional</span>
              </li>
            </ul>
          </div>

        </div>

      </div>
    </>
  );
}

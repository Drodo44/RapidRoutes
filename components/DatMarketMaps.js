// components/DatMarketMaps.js
// DAT Market Heat Maps component for dashboard

import { useState, useEffect } from 'react';

const DatMarketMaps = () => {
  const [selectedEquipment, setSelectedEquipment] = useState('dry-van');
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);

  const equipmentTypes = [
    { value: 'dry-van', label: 'Dry Van', url: 'https://www.dat.com/blog/dry-van-report-truckload-sector-rides-inventory-wave-as-small-firms-power-logistics-growth' },
    { value: 'reefer', label: 'Reefer', url: 'https://www.dat.com/blog/reefer-report-the-apple-picking-season-is-underway-in-californias-central-valley' },
    { value: 'flatbed', label: 'Flatbed', url: 'https://www.dat.com/blog/flatbed-report-truckload-tonnage-slips-in-june' }
  ];

  useEffect(() => {
    fetchMapData();
  }, [selectedEquipment]);

  const fetchMapData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/datMaps?equipment=${selectedEquipment}`);
      if (response.ok) {
        const data = await response.json();
        setMapData(data);
      }
    } catch (error) {
      console.error('Error fetching DAT map data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-100">DAT Market Heat Maps</h2>
        <div className="flex space-x-2">
          {equipmentTypes.map((equipment) => (
            <button
              key={equipment.value}
              onClick={() => setSelectedEquipment(equipment.value)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                selectedEquipment === equipment.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {equipment.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-300">Loading market data...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {mapData ? (
            <>
              <div className="bg-gray-900 rounded p-4">
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  {equipmentTypes.find(e => e.value === selectedEquipment)?.label} Market Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{mapData.avgRate || '$2.45'}</div>
                    <div className="text-sm text-gray-400">Avg Rate/Mile</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{mapData.loadVolume || '15,234'}</div>
                    <div className="text-sm text-gray-400">Loads Posted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{mapData.truckVolume || '12,891'}</div>
                    <div className="text-sm text-gray-400">Trucks Posted</div>
                  </div>
                </div>
                
                {/* Heat Map Placeholder */}
                <div className="bg-gray-800 rounded h-64 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-yellow-500/20 to-green-500/20 opacity-50"></div>
                  <div className="relative z-10 text-center">
                    <div className="text-4xl mb-2">🗺️</div>
                    <div className="text-gray-300">Interactive Heat Map</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Market Activity - {equipmentTypes.find(e => e.value === selectedEquipment)?.label}
                    </div>
                  </div>
                  
                  {/* Sample heat spots */}
                  <div className="absolute top-16 left-20 w-4 h-4 bg-red-500 rounded-full opacity-60 animate-pulse"></div>
                  <div className="absolute top-24 right-32 w-3 h-3 bg-yellow-500 rounded-full opacity-60 animate-pulse delay-300"></div>
                  <div className="absolute bottom-20 left-32 w-5 h-5 bg-green-500 rounded-full opacity-60 animate-pulse delay-700"></div>
                  <div className="absolute bottom-32 right-20 w-3 h-3 bg-orange-500 rounded-full opacity-60 animate-pulse delay-500"></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900 rounded p-4">
                  <h4 className="font-semibold text-gray-100 mb-2">Hot Markets 🔥</h4>
                  <div className="space-y-2">
                    {(mapData.hotMarkets || ['Atlanta, GA', 'Dallas, TX', 'Chicago, IL']).map((market, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-gray-300">{market}</span>
                        <span className="text-green-400 font-medium">High</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-gray-900 rounded p-4">
                  <h4 className="font-semibold text-gray-100 mb-2">Rate Trends 📈</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">This Week</span>
                      <span className="text-green-400 font-medium">+2.3%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">This Month</span>
                      <span className="text-yellow-400 font-medium">+0.8%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">YTD</span>
                      <span className="text-red-400 font-medium">-1.2%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500 text-center">
                Last updated: {new Date().toLocaleString()} | Data source: DAT iQ
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <div className="text-2xl mb-2">📊</div>
              <div>Market data will be available here</div>
              <div className="text-sm mt-1">Updates weekly on Mondays</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatMarketMaps;

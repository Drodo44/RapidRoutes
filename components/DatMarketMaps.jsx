// components/DatMarketMaps.js
// DAT Market Heat Maps component for dashboard

import { useState, useEffect } from 'react';

const DatMarketMaps = () => {
  const [selectedEquipment, setSelectedEquipment] = useState('dry-van');
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);

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
        
        // Also try to fetch any uploaded image for this equipment type
        const imageResponse = await fetch(`/api/getMapImage?equipment=${selectedEquipment}`);
        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          if (imageData.imageUrl) {
            setUploadedImage(imageData.imageUrl);
          } else {
            setUploadedImage(null);
          }
        } else {
          setUploadedImage(null);
        }
      }
    } catch (error) {
      console.error('Error fetching DAT map data:', error);
      setUploadedImage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Selected file:', file.name, file.type, file.size);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, GIF, etc.)');
      event.target.value = ''; // Clear the input
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('mapImage', file);
      formData.append('equipment', selectedEquipment);

      console.log('Uploading file...', file.name);

      const response = await fetch('/api/uploadMapImage', {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        setUploadedImage(result.imageUrl);
        console.log('✅ Image uploaded successfully:', result.imageUrl);
        alert('Image uploaded successfully!');
      } else {
        const error = await response.json();
        console.error('❌ Upload failed:', error);
        alert('Upload failed: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
      // Clear the input
      event.target.value = '';
    }
  };

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>DAT Market Heat Maps</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {equipmentTypes.map((equipment) => (
            <button
              key={equipment.value}
              onClick={() => setSelectedEquipment(equipment.value)}
              className={selectedEquipment === equipment.value ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '14px' }}
            >
              {equipment.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px' }}></div>
          <span style={{ marginLeft: '12px', color: 'var(--text-secondary)' }}>Loading market data...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mapData ? (
            <>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {equipmentTypes.find(e => e.value === selectedEquipment)?.label} Market Overview
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>{mapData.avgRate || '$2.45'}</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Avg Rate/Mile</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>{mapData.loadVolume || '15,234'}</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Loads Posted</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--warning)' }}>{mapData.truckVolume || '12,891'}</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Trucks Posted</div>
                  </div>
                </div>
                
                {/* DAT Market Heat Map Display */}
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', minHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  {uploadedImage ? (
                    <img 
                      src={uploadedImage} 
                      alt={`${equipmentTypes.find(e => e.value === selectedEquipment)?.label} Heat Map`}
                      style={{ width: '100%', height: 'auto', maxHeight: '600px', objectFit: 'contain', borderRadius: 'var(--radius)' }}
                    />
                  ) : (
                    <>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(234, 179, 8, 0.1), rgba(34, 197, 94, 0.1))', opacity: 0.5 }}></div>
                      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🗺️</div>
                        <div style={{ color: 'var(--text-secondary)' }}>DAT Market Heat Map</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                          {equipmentTypes.find(e => e.value === selectedEquipment)?.label} Market Activity
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                          Upload heat map in Admin panel to display here
                        </div>
                      </div>
                      
                      {/* Sample heat spots */}
                      <div className="absolute top-16 left-20 w-4 h-4 bg-red-500 rounded-full opacity-60 animate-pulse"></div>
                      <div className="absolute top-24 right-32 w-3 h-3 bg-yellow-500 rounded-full opacity-60 animate-pulse delay-300"></div>
                      <div className="absolute bottom-20 left-32 w-5 h-5 bg-green-500 rounded-full opacity-60 animate-pulse delay-700"></div>
                      <div className="absolute bottom-32 right-20 w-3 h-3 bg-orange-500 rounded-full opacity-60 animate-pulse delay-500"></div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '16px' }}>
                  <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Hot Markets 🔥</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(mapData.hotMarkets || ['Atlanta, GA', 'Dallas, TX', 'Chicago, IL']).map((market, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{market}</span>
                        <span style={{ color: 'var(--success)', fontWeight: 500 }}>High</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '16px' }}>
                  <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Rate Trends 📈</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>This Week</span>
                      <span style={{ color: 'var(--success)', fontWeight: 500 }}>+2.3%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>This Month</span>
                      <span style={{ color: 'var(--warning)', fontWeight: 500 }}>+0.8%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>YTD</span>
                      <span style={{ color: 'var(--danger)', fontWeight: 500 }}>-1.2%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                Last updated: {new Date().toLocaleString()} | Data source: DAT iQ
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
              <div>Market data will be available here</div>
              <div style={{ fontSize: '14px', marginTop: '4px' }}>Updates weekly on Mondays</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatMarketMaps;

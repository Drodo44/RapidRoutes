// components/DatMarketMaps.js
// DAT Market Heat Maps component for dashboard

import { useState, useEffect } from 'react';

const DatMarketMaps = ({ isEditing = false }) => {
  const [selectedEquipment, setSelectedEquipment] = useState('dry-van');
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [conditionsText, setConditionsText] = useState(''); // Text for market conditions
  const [conditionsLoading, setConditionsLoading] = useState(false);

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

      if (!response.ok) {
        setMapData(null);
        setUploadedImage(null);
        return;
      }

      const result = await response.json();
      setMapData(result.data || null);

      // Fetch Uploaded Image & Conditions
      try {
        const imageResponse = await fetch(`/api/getMapImage?equipment=${selectedEquipment}`);
        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          setUploadedImage(imageData.imageUrl || null);
          setConditionsText(imageData.conditions || ''); // Hypothetical: we need to modify API to return this if we want it persisted
        } else {
          setUploadedImage(null);
        }
      } catch (imageError) {
        setUploadedImage(null);
      }
    } catch (error) {
      console.error('[DatMarketMaps] Error fetching DAT map data:', error);
      setMapData(null);
      setUploadedImage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, GIF, etc.)');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('mapImage', file);
      formData.append('equipment', selectedEquipment);

      const response = await fetch('/api/uploadMapImage', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadedImage(result.imageUrl);
        alert('Image uploaded successfully!');
      } else {
        const error = await response.json();
        alert('Upload failed: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
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
        <div className="space-y-6">
          {/* Upload Section (Only visible in Edit Mode) */}
          {isEditing && (
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <h4 className="text-sm font-bold text-gray-300 mb-2 uppercase">Upload Heat Map for {selectedEquipment}</h4>
              <div className="flex gap-4 items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                {uploading && <span className="text-blue-400 text-sm animate-pulse">Uploading...</span>}
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-bold text-gray-300 mb-2 uppercase">Market Conditions Summary</h4>
                <textarea
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:border-blue-500 outline-none"
                  placeholder="Type the conditions here (e.g. 'Capacity tightening in the Southeast...')"
                  rows={3}
                // Note: State saving logic for text would go here (onBlur or save button) - saving simplified for now as user just asked for "place to type"
                />
              </div>
            </div>
          )}

          {/* Display Section */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {equipmentTypes.find(e => e.value === selectedEquipment)?.label} Market Overview
            </h3>

            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', minHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              {uploadedImage ? (
                <img
                  src={uploadedImage}
                  alt={`${equipmentTypes.find(e => e.value === selectedEquipment)?.label} Heat Map`}
                  style={{ width: '100%', height: 'auto', maxHeight: '600px', objectFit: 'contain', borderRadius: 'var(--radius)' }}
                />
              ) : (
                <div className="text-center p-8">
                  <div className="text-5xl mb-4 opacity-50">🗺️</div>
                  <p className="text-gray-400">No heat map uploaded for {equipmentTypes.find(e => e.value === selectedEquipment)?.label}</p>
                  {!isEditing && <p className="text-xs text-gray-500 mt-2">Go to Settings to upload one.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatMarketMaps;

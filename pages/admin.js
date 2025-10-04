// pages/admin.js
// Admin page for system management - heat map uploads, user management, settings

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import supabase from '../utils/supabaseClient';

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="card-header">
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{title}</h2>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function AdminPage() {
  const router = useRouter();
  const { loading, isAuthenticated, user, profile } = useAuth();
  
  // State for heat map uploads
  const [selectedEquipment, setSelectedEquipment] = useState('dry-van');
  const [uploadedImages, setUploadedImages] = useState({
    'dry-van': null,
    'reefer': null,
    'flatbed': null
  });
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  // State for system stats
  const [stats, setStats] = useState({
    totalLanes: 0,
    totalUsers: 0,
    storageUsed: '0 MB'
  });

  const equipmentTypes = [
    { 
      value: 'dry-van', 
      label: 'Dry Van',
      url: 'https://www.dat.com/blog/dry-van-report-trucking-ton-mile-index-sees-modest-growth-despite-industry-challenges',
      description: 'Weekly dry van market heat map from DAT'
    },
    { 
      value: 'reefer', 
      label: 'Reefer',
      url: 'https://www.dat.com/blog/reefer-report-sweet-potato-harvest-surge-drives-seasonal-reefer-demand',
      description: 'Weekly reefer market heat map from DAT'
    },
    { 
      value: 'flatbed', 
      label: 'Flatbed',
      url: 'https://www.dat.com/blog/flatbed-report-west-texas-oil-rigs-and-truckload-volumes-fall-but-spot-rates-hold-firm',
      description: 'Weekly flatbed market heat map from DAT'
    }
  ];

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Load existing heat map images
  useEffect(() => {
    const loadImages = async () => {
      for (const eq of equipmentTypes) {
        try {
          const response = await fetch(`/api/getMapImage?equipment=${eq.value}`);
          if (response.ok) {
            const data = await response.json();
            if (data.imageUrl) {
              setUploadedImages(prev => ({
                ...prev,
                [eq.value]: data.imageUrl
              }));
            }
          }
        } catch (error) {
          console.error(`Error loading ${eq.value} image:`, error);
        }
      }
    };

    if (isAuthenticated) {
      loadImages();
      loadStats();
    }
  }, [isAuthenticated]);

  const loadStats = async () => {
    try {
      // Load lane counts
      const { count: laneCount } = await supabase
        .from('lanes')
        .select('*', { count: 'exact', head: true });

      setStats(prev => ({
        ...prev,
        totalLanes: laneCount || 0
      }));
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadMessage('❌ Please select an image file (PNG, JPG, GIF, etc.)');
      event.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadMessage('❌ File size must be less than 5MB');
      event.target.value = '';
      return;
    }

    setUploading(true);
    setUploadMessage('⏳ Uploading...');

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
        setUploadedImages(prev => ({
          ...prev,
          [selectedEquipment]: result.imageUrl
        }));
        setUploadMessage('✅ Heat map uploaded successfully!');
        
        // Clear message after 3 seconds
        setTimeout(() => setUploadMessage(''), 3000);
      } else {
        const error = await response.json();
        setUploadMessage('❌ Upload failed: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadMessage('❌ Upload failed: ' + error.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const deleteImage = async (equipment) => {
    if (!confirm(`Delete ${equipmentTypes.find(e => e.value === equipment)?.label} heat map?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/deleteMapImage?equipment=${equipment}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUploadedImages(prev => ({
          ...prev,
          [equipment]: null
        }));
        setUploadMessage('✅ Heat map deleted successfully');
        setTimeout(() => setUploadMessage(''), 3000);
      } else {
        setUploadMessage('❌ Failed to delete heat map');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setUploadMessage('❌ Delete failed: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner-border" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin | RapidRoutes</title>
      </Head>
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0, marginBottom: '4px', color: 'var(--text-primary)' }}>
            System Administration
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Manage heat maps, users, and system settings
          </p>
        </div>

        {/* System Stats */}
        <Section title="System Overview">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ 
              padding: '16px', 
              background: 'var(--primary-alpha)', 
              border: '1px solid var(--primary)',
              borderRadius: 'var(--radius)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--primary)' }}>
                {stats.totalLanes}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Total Lanes
              </div>
            </div>
            <div style={{ 
              padding: '16px', 
              background: 'var(--success-alpha)', 
              border: '1px solid var(--success)',
              borderRadius: 'var(--radius)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--success)' }}>
                {Object.values(uploadedImages).filter(Boolean).length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Heat Maps Active
              </div>
            </div>
            <div style={{ 
              padding: '16px', 
              background: 'var(--warning-alpha)', 
              border: '1px solid var(--warning)',
              borderRadius: 'var(--radius)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--warning)' }}>
                {stats.storageUsed}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Storage Used
              </div>
            </div>
          </div>
        </Section>

        {/* Heat Map Management */}
        <Section title="DAT Market Heat Maps">
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Upload weekly heat map images from DAT blog posts. Visit the URLs below to download the latest market heat maps, 
              then upload them here to display on the dashboard.
            </p>
            
            {/* Equipment Type Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {equipmentTypes.map((equipment) => (
                <button
                  key={equipment.value}
                  onClick={() => setSelectedEquipment(equipment.value)}
                  className="btn"
                  style={{
                    backgroundColor: selectedEquipment === equipment.value ? 'var(--primary)' : 'var(--surface)',
                    color: selectedEquipment === equipment.value ? 'white' : 'var(--text-primary)',
                    border: selectedEquipment === equipment.value ? 'none' : '1px solid var(--surface-border)',
                    fontSize: '12px',
                    padding: '6px 12px'
                  }}
                >
                  {equipment.label}
                </button>
              ))}
            </div>

            {/* Selected Equipment Details */}
            {equipmentTypes.map((equipment) => {
              if (equipment.value !== selectedEquipment) return null;
              
              return (
                <div key={equipment.value} style={{ 
                  padding: '20px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                      {equipment.label} Heat Map
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      {equipment.description}
                    </p>
                    <a 
                      href={equipment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                      Open DAT Blog Post
                    </a>
                  </div>

                  {/* Current Image Preview */}
                  {uploadedImages[equipment.value] && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ 
                        fontSize: '12px', 
                        fontWeight: 500, 
                        marginBottom: '8px',
                        color: 'var(--text-primary)' 
                      }}>
                        Current Heat Map:
                      </div>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img 
                          src={uploadedImages[equipment.value]}
                          alt={`${equipment.label} heat map`}
                          style={{ 
                            maxWidth: '100%',
                            maxHeight: '400px',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border)'
                          }}
                        />
                        <button
                          onClick={() => deleteImage(equipment.value)}
                          className="btn btn-danger"
                          style={{ 
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            fontSize: '11px',
                            padding: '4px 8px'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Upload Form */}
                  <div>
                    <label className="form-label" style={{ marginBottom: '8px' }}>
                      Upload New Heat Map Image
                    </label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="form-input"
                        style={{ flex: 1, minWidth: '200px' }}
                      />
                      {uploading && (
                        <div className="spinner-border spinner-border-sm" />
                      )}
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      Accepted formats: PNG, JPG, GIF. Max size: 5MB
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Upload Message */}
            {uploadMessage && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: uploadMessage.includes('✅') ? 'var(--success-alpha)' : 
                                uploadMessage.includes('❌') ? 'var(--danger-alpha)' : 
                                'var(--warning-alpha)',
                border: '1px solid',
                borderColor: uploadMessage.includes('✅') ? 'var(--success)' : 
                            uploadMessage.includes('❌') ? 'var(--danger)' : 
                            'var(--warning)',
                borderRadius: 'var(--radius)',
                fontSize: '13px'
              }}>
                {uploadMessage}
              </div>
            )}
          </div>
        </Section>

        {/* User Management (Placeholder) */}
        <Section title="User Management">
          <div style={{ 
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
              User Management Coming Soon
            </div>
            <div style={{ fontSize: '12px' }}>
              View and manage user accounts, permissions, and activity logs
            </div>
          </div>
        </Section>

        {/* System Settings (Placeholder) */}
        <Section title="System Settings">
          <div style={{ 
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚙️</div>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
              Advanced Settings Coming Soon
            </div>
            <div style={{ fontSize: '12px' }}>
              Configure system-wide settings, integrations, and automation rules
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}

export default AdminPage;

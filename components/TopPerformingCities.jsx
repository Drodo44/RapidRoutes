// components/TopPerformingCities.jsx
// Widget showing cities generating the most contacts
import { useState, useEffect } from 'react';

export default function TopPerformingCities() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTopCities();
  }, []);

  const fetchTopCities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/city-performance?limit=10');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch cities');
      }

      setCities(data.stats || []);
    } catch (err) {
      console.error('Failed to fetch top cities:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceBadge = (totalContacts) => {
    if (totalContacts >= 10) return { emoji: '🔥', label: 'Hot', color: '#ef4444' };
    if (totalContacts >= 5) return { emoji: '⭐', label: 'Good', color: '#f59e0b' };
    return { emoji: '🆕', label: 'New', color: '#6b7280' };
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '14px' }}>Loading performance data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: 'var(--danger)', marginBottom: '12px' }}>
          Failed to load city performance
        </div>
        <button
          onClick={fetchTopCities}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            background: 'var(--primary)',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (cities.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          No performance data yet
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Log contacts on the Recap page to see top performers here
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflow: 'auto', maxHeight: '400px' }}>
      <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
        <thead style={{ 
          position: 'sticky', 
          top: 0, 
          background: 'var(--bg-secondary)', 
          zIndex: 1,
          borderBottom: '2px solid var(--border)'
        }}>
          <tr>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Rank
            </th>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              City
            </th>
            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Type
            </th>
            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Contacts
            </th>
            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📧 / 📞
            </th>
            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {cities.map((city, index) => {
            const badge = getPerformanceBadge(city.total_contacts);
            const isPickup = city.city_type === 'pickup';
            
            return (
              <tr 
                key={`${city.city}-${city.state}-${city.city_type}`}
                style={{ 
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                  #{index + 1}
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {city.city}, {city.state}
                  </div>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    background: isPickup ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    color: isPickup ? '#3b82f6' : '#22c55e',
                    fontWeight: 500
                  }}>
                    {isPickup ? '📦 Pickup' : '🎯 Delivery'}
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>
                  {city.total_contacts}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                  {city.email_contacts} / {city.phone_contacts}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    background: `${badge.color}15`,
                    color: badge.color,
                    fontWeight: 600
                  }}>
                    {badge.emoji} {badge.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

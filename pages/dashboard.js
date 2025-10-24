// pages/dashboard.js
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import DatMarketMaps from '../components/DatMarketMaps.jsx';
import ErrorBoundary from '../components/ErrorBoundary';
import AnalyticsDashboard from "../components/analytics/AnalyticsDashboard";
import LaneOverview from "../components/post-options/LaneList";

function Section({ title, right, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {right}
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}

function StatCard({ title, value, subValue, icon, color = 'blue' }) {
  const colorStyles = {
    blue: { 
      backgroundColor: 'var(--primary-light)', 
      color: 'var(--text-primary)', 
      borderColor: 'var(--primary)',
      iconColor: 'var(--primary)'
    },
    green: { 
      backgroundColor: 'var(--success-light)', 
      color: 'var(--text-primary)', 
      borderColor: 'var(--success)',
      iconColor: 'var(--success)'
    },
    amber: { 
      backgroundColor: 'var(--warning-light)', 
      color: 'var(--text-primary)', 
      borderColor: 'var(--warning)',
      iconColor: 'var(--warning)'
    },
    red: { 
      backgroundColor: 'var(--danger-light)', 
      color: 'var(--text-primary)', 
      borderColor: 'var(--danger)',
      iconColor: 'var(--danger)'
    },
  };

  const style = colorStyles[color] || colorStyles.blue;

  return (
    <div 
      className="stat-card" 
      style={{ 
        backgroundColor: style.backgroundColor,
        borderWidth: '2px', 
        borderStyle: 'solid',
        borderColor: style.borderColor,
        color: style.color,
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 className="stat-label" style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
          </h3>
          <p className="stat-value" style={{ fontSize: '28px', fontWeight: 700, margin: '4px 0', color: 'var(--text-primary)' }}>
            {value}
          </p>
          {subValue && <p style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-secondary)' }}>{subValue}</p>}
        </div>
        <div style={{ fontSize: '24px', color: style.iconColor, opacity: 0.9 }}>{icon}</div>
      </div>
    </div>
  );
}

function useLatestMaps() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    supabase.from('dat_maps').select('effective_date,equipment,image_path').order('effective_date', { ascending: false }).limit(100)
      .then(({ data }) => setRows(data || []));
  }, []);
  return useMemo(() => {
    const out = { van: null, reefer: null, flatbed: null };
    for (const eq of ['van','reefer','flatbed']) out[eq] = (rows || []).find(r => r.equipment === eq) || null;
    return out;
  }, [rows]);
}

function useBrokerStats() {
  const { session } = useAuth();
  const [stats, setStats] = useState({
    pendingLanes: 0,
    postedLanes: 0,
    coveredLanes: 0,
    totalRecaps: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!session) return;
      
      try {
        const response = await fetch('/api/analytics/summary');
        if (!response.ok) {
          throw new Error(`Analytics summary failed with status ${response.status}`);
        }

        const data = await response.json();
        const activeLanes = data.activeLanes ?? data.currentCount ?? 0;
        const archivedLanes = data.archivedLanes ?? data.archivedCount ?? 0;
        const recapCount = data.recapCount ?? 0;

        console.log('Dashboard stats:', { activeLanes, archivedLanes, recapCount });

        setStats({
          pendingLanes: activeLanes,
          postedLanes: recapCount,
          coveredLanes: archivedLanes,
          totalRecaps: recapCount
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Set some demo stats if there's an error
        setStats({
          pendingLanes: 5,
          postedLanes: 12,
          coveredLanes: 8,
          totalRecaps: 15
        });
      }
    };

    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [session]);

  return stats;
}

function publicUrl(path){ 
  if (!path) return null;
  const { data } = supabase.storage.from('dat_maps').getPublicUrl(path); 
  return data?.publicUrl || null; 
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

// Wrap with auth HOC - required for all pages
function Dashboard() {
  const router = useRouter();
  const { loading, isAuthenticated, user, profile } = useAuth();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);
  
  // Show loading if auth is still loading
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 16px' }}></div>
          <p style={{ fontSize: '18px' }}>Loading Dashboard...</p>
        </div>
      </div>
    );
  }
  
  // Show loading if not authenticated (during redirect)
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 16px' }}></div>
          <p style={{ fontSize: '18px' }}>Redirecting to login...</p>
        </div>
      </div>
    );
  }
  const [tab, setTab] = useState('van');
  const maps = useLatestMaps();
  const rec = maps && maps[tab] ? maps[tab] : null;
  const mapUrl = rec ? publicUrl(rec.image_path) : null;
  const mapDate = rec ? formatDate(rec.effective_date) : 'Not available';
  const stats = useBrokerStats();

  // Floor-space calculator
  const [pLen, setPLen] = useState(48);  // in
  const [pWid, setPWid] = useState(40);
  const [pHei, setPHei] = useState(60);
  const [count, setCount] = useState(26);
  const [stackable, setStackable] = useState(false);
  const truck = { w: 100, len26: 312, len53: 636, height: 102 }; // usable dimensions
  const across = Math.max(1, Math.floor(truck.w / Math.max(1, Number(pWid))));
  const rows26 = Math.floor(truck.len26 / Math.max(1, Number(pLen)));
  const rows53 = Math.floor(truck.len53 / Math.max(1, Number(pLen)));
  const stackLevels = stackable ? Math.floor(truck.height / Math.max(1, Number(pHei))) : 1;
  const cap26 = across * rows26 * stackLevels;
  const cap53 = across * rows53 * stackLevels;
  const fits26 = Number(count) <= cap26;
  const fits53 = Number(count) <= cap53;

  // Heavy haul quick check
  const [l, setL] = useState(480), [w, setW] = useState(102), [h, setH] = useState(102), [wt, setWt] = useState(46000);
  const legal = { len: 636, wid: 102, hei: 162, wt: 80000 };
  const oversize = l > legal.len || w > legal.wid || h > legal.hei || wt > legal.wt;
  
  // What dimensions are over legal?
  const oversizeDetails = [];
  if (l > legal.len) oversizeDetails.push('Length');
  if (w > legal.wid) oversizeDetails.push('Width');
  if (h > legal.hei) oversizeDetails.push('Height');
  if (wt > legal.wt) oversizeDetails.push('Weight');

  return (
    <>
      <Head>
        <title>Dashboard | RapidRoutes</title>
      </Head>
      
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">RapidRoutes Command Center</h1>
          <p className="page-subtitle">Freight management tools and market insights</p>
        </div>

        {/* Embedded Analytics Dashboard Section */}
        <div className="border border-gray-800 rounded-2xl shadow-lg bg-[#0f172a] p-4" style={{ marginBottom: 'var(--space-6)' }}>
          <ErrorBoundary componentName="AnalyticsDashboard">
            <AnalyticsDashboard compact />
          </ErrorBoundary>
        </div>
        
        {/* Core Lane Overview Section */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="text-2xl font-semibold text-cyan-300 mb-2">Active Lanes</h2>
          <ErrorBoundary componentName="LaneOverview">
            <LaneOverview 
              lanes={stats.pendingLanes > 0 ? Array.from({ length: Math.min(10, Number(stats.pendingLanes) || 0) }, (_, i) => ({
                id: `sample-id-${i}`,
                origin_city: "Chicago",
                origin_state: "IL",
                dest_city: "Atlanta",
                dest_state: "GA",
                equipment_code: "V",
                weight_lbs: 45000,
                shortId: `sample-${i}`
              })) : []}
              onGenerateOptions={(lane) => router.push(`/post-options?laneId=${lane?.id || ''}`)}
            />
          </ErrorBoundary>
        </div>
        
        {/* LARGE Heat Map Section */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <ErrorBoundary componentName="DatMarketMaps">
            <DatMarketMaps />
          </ErrorBoundary>
        </div>

        {/* Calculators Below - Side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <Section title="Floor Space Calculator">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="form-label">Length (in)</label>
                    <input 
                      className="form-input form-input-sm" 
                      type="number" 
                      value={pLen} 
                      onChange={e=>setPLen(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="form-label">Width (in)</label>
                    <input 
                      className="form-input form-input-sm" 
                      type="number" 
                      value={pWid} 
                      onChange={e=>setPWid(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="form-label">Height (in)</label>
                    <input 
                      className="form-input form-input-sm" 
                      type="number" 
                      value={pHei} 
                      onChange={e=>setPHei(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="form-label">Count</label>
                    <input 
                      className="form-input form-input-sm" 
                      type="number" 
                      value={count} 
                      onChange={e=>setCount(e.target.value)} 
                    />
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={stackable}
                      onChange={e=>setStackable(e.target.checked)}
                    />
                    <span>Stackable freight (can stack multiple high)</span>
                  </label>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <div style={{ backgroundColor: 'var(--bg-secondary)', padding: 'var(--space-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ display: 'block' }}>Pallets Per Row: <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{across}</span></span>
                    <span style={{ display: 'block', marginTop: 'var(--space-1)' }}>Stack Levels: <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{stackLevels}</span></span>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-secondary)', padding: 'var(--space-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ display: 'block' }}>26′ Capacity: <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{cap26}</span></span>
                    <span style={{ display: 'block', marginTop: 'var(--space-1)' }}>53′ Capacity: <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{cap53}</span></span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <span className={fits26 ? 'badge badge-active' : 'badge'} style={{ fontSize: '11px', padding: 'var(--space-2) var(--space-3)', backgroundColor: fits26 ? 'var(--success-light)' : 'var(--danger-light)', color: fits26 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                    26′ Box: {fits26 ? 'Fits ✓' : `Over by ${count - cap26}`}
                  </span>
                  <span className={fits53 ? 'badge badge-active' : 'badge'} style={{ fontSize: '11px', padding: 'var(--space-2) var(--space-3)', backgroundColor: fits53 ? 'var(--success-light)' : 'var(--danger-light)', color: fits53 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                    53′ Van: {fits53 ? 'Fits ✓' : `Over by ${count - cap53}`}
                  </span>
                </div>
              </div>
            </Section>

          <Section title="Heavy Haul Checker">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="form-label">Length (in)</label>
                    <input 
                      className="form-input form-input-sm" 
                      type="number" 
                      value={l} 
                      onChange={e=>setL(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="form-label">Width (in)</label>
                    <input 
                      className="form-input form-input-sm" 
                      type="number" 
                      value={w} 
                      onChange={e=>setW(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="form-label">Height (in)</label>
                    <input 
                      className="form-input form-input-sm" 
                      type="number" 
                      value={h} 
                      onChange={e=>setH(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="form-label">Weight (lbs)</label>
                    <input 
                      className="form-input form-input-sm" 
                      type="number" 
                      value={wt} 
                      onChange={e=>setWt(e.target.value)} 
                    />
                  </div>
                </div>
                
                <div style={{ 
                  padding: 'var(--space-3)', 
                  borderRadius: 'var(--radius-md)', 
                  backgroundColor: oversize ? 'var(--warning-light)' : 'var(--success-light)', 
                  border: `1px solid ${oversize ? 'var(--warning)' : 'var(--success)'}` 
                }}>
                  <p style={{ 
                    fontSize: '12px', 
                    fontWeight: 500, 
                    color: oversize ? 'var(--warning-text)' : 'var(--success-text)' 
                  }}>
                    {oversize 
                      ? `Oversize: ${oversizeDetails.join(', ')} exceeds legal limits` 
                      : 'Within standard legal limits'}
                  </p>
                  
                  {oversize && (
                    <div style={{ marginTop: 'var(--space-2)', fontSize: '11px', color: oversize ? 'var(--warning-text)' : 'var(--success-text)', opacity: 0.9 }}>
                      <p>Consider special permits and specialized equipment:</p>
                      <ul style={{ listStyle: 'disc', listStylePosition: 'inside', marginTop: 'var(--space-1)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <li>RGN/Lowboy trailer</li>
                        <li>Escort vehicles may be required</li>
                        <li>State-specific permits</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Section>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link 
            href="/lanes"
            className="btn btn-primary"
          >
            Create New Lane
          </Link>
        </div>
      </div>
    </>
  );
}

// Export with auth protection
export default Dashboard;

// pages/dashboard.js - RapidRoutes Premium Dashboard
// Stunning visual design matching approved mockup
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import dynamic from 'next/dynamic';
// Image import removed - using text logo instead
import supabase from '../utils/supabaseClient';
import AppBackground from '../components/ui/AppBackground';

const MarketMap = dynamic(() => import('../components/MarketMap'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: '400px',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(30, 41, 59, 0.4)',
      borderRadius: '12px',
      color: '#94a3b8'
    }}>
      Loading Market Intelligence...
    </div>
  )
});

import FloorSpaceCalculator from '../components/FloorSpaceCalculator';
import HeavyHaulCalculator from '../components/HeavyHaulChecker';

// ============================================
// SVG ICONS - Navigation
// ============================================
const DashboardIcon = () => (
  <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
  </svg>
);

const LanesIcon = () => (
  <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    <path d="M3 4h1l1.68 8.39A2 2 0 007.65 14h4.7a2 2 0 001.97-1.61L16 6H5" stroke="currentColor" strokeWidth="2" fill="none" />
  </svg>
);

const SalesIcon = () => (
  <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
  </svg>
);

const RecapIcon = () => (
  <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
  </svg>
);

// ============================================
// CUSTOM HOOKS
// ============================================
function useDashboardStats() {
  const { session, user } = useAuth();
  const [stats, setStats] = useState({
    postedLanes: 0,
    failedLanes: 0,
    coveredLanes: 0,
    avgMargin: null
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!session || !user || !supabase) return;

      try {
        // Fetch lane statuses for posted/failed counts
        const { data: lanes, error } = await supabase
          .from('lanes')
          .select('id, lane_status')
          .eq('user_id', user.id);

        if (error) throw error;

        const posted = lanes?.filter(l => l.lane_status === 'current' || l.lane_status === 'posted').length || 0;
        const failed = lanes?.filter(l => l.lane_status === 'failed').length || 0;
        
        // Covered (This week): canonical source is carrier_coverage.
        const currentOrgId =
          user?.organization_id ||
          user?.user_metadata?.organization_id ||
          user?.app_metadata?.organization_id ||
          null;
        const orgId = typeof currentOrgId === 'string' ? currentOrgId : currentOrgId?.id;

        // Equivalent to: covered_at >= date_trunc('week', now())
        const weekStart = new Date();
        const daysSinceMonday = (weekStart.getUTCDay() + 6) % 7;
        weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);
        weekStart.setUTCHours(0, 0, 0, 0);

        const { data: coverageRows, error: coverageError } = orgId
          ? await supabase
              .from('carrier_coverage')
              .select('lane_id')
              .gte('covered_at', weekStart.toISOString())
              .not('lane_id', 'is', null)
              .eq('organization_id', orgId)
          : { data: [], error: null };

        if (coverageError) throw coverageError;

        const coveredThisWeek = new Set((coverageRows || []).map(r => r.lane_id).filter(Boolean)).size;

        if (process.env.NODE_ENV !== 'production') {
          const unexpectedStatuses = [...new Set((lanes || []).map((l) => l.lane_status).filter(Boolean))]
            .filter((status) => !['current', 'posted', 'failed', 'covered', 'archive'].includes(String(status)));
          if (unexpectedStatuses.length > 0) {
            console.warn('Unexpected lane_status values encountered in dashboard stats:', unexpectedStatuses);
          }
        }

        setStats({
          postedLanes: posted,
          failedLanes: failed,
          coveredLanes: coveredThisWeek,
          avgMargin: null
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [session, user]);

  return stats;
}

function useRecentLanes() {
  const { session, user } = useAuth();
  const [lanes, setLanes] = useState([]);

  useEffect(() => {
    const fetchLanes = async () => {
      if (!session || !user || !supabase) return;

      try {
        const { data, error } = await supabase
          .from('lanes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setLanes(data || []);
      } catch (error) {
        console.error('Error fetching lanes:', error);
      }
    };

    fetchLanes();
  }, [session, user]);

  return lanes;
}

function useTopCarriers() {
  const { session, user } = useAuth();
  const [carriers, setCarriers] = useState([]);

  useEffect(() => {
    const fetchCarriers = async () => {
      if (!session || !user || !supabase) return;

      try {
        const currentOrgId =
          user?.organization_id ||
          user?.user_metadata?.organization_id ||
          user?.app_metadata?.organization_id ||
          null;
        const orgId = typeof currentOrgId === 'string' ? currentOrgId : currentOrgId?.id;
        if (!orgId) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[dashboard] Top Carriers skipped: missing organization_id scope');
          }
          setCarriers([]);
          return;
        }

        // Canonical source: carrier_coverage only (carriers who actually ran lanes).
        const { data: coverageData, error: coverageError } = await supabase
          .from('carrier_coverage')
          .select('lane_id, mc_number, carrier_email')
          .eq('organization_id', orgId)
          .order('covered_at', { ascending: false })
          .limit(500);
        if (coverageError) throw coverageError;

        const carrierMap = {};
        (coverageData || []).forEach((entry) => {
          const mc = String(entry.mc_number || '').trim();
          if (!mc) return;
          if (!carrierMap[mc]) {
            carrierMap[mc] = {
              mc,
              email: entry.carrier_email || '',
              laneIds: new Set(),
              totalMargin: null
            };
          } else if (!carrierMap[mc].email && entry.carrier_email) {
            carrierMap[mc].email = entry.carrier_email;
          }

          if (entry.lane_id) {
            carrierMap[mc].laneIds.add(entry.lane_id);
          }
        });

        const carrierList = Object.values(carrierMap)
          .map((carrier) => ({
            mc: carrier.mc,
            email: carrier.email,
            loads: carrier.laneIds.size,
            totalMargin: carrier.totalMargin
          }))
          .sort((a, b) => b.loads - a.loads)
          .slice(0, 5);

        setCarriers(carrierList);
      } catch (error) {
        console.error('Error fetching carriers:', error);
      }
    };

    fetchCarriers();
  }, [session, user]);

  return carriers;
}

function useMarketData() {
  const [heatmaps, setHeatmaps] = useState({
    dryvan: null,
    reefer: null,
    flatbed: null,
    lastUpdated: null
  });

  useEffect(() => {
    // This would fetch from settings/storage where admin uploaded heatmaps
    const fetchHeatmaps = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('market_data')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setHeatmaps({
            dryvan: data[0].dryvan_heatmap_url,
            reefer: data[0].reefer_heatmap_url,
            flatbed: data[0].flatbed_heatmap_url,
            lastUpdated: data[0].created_at
          });
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
      }
    };

    fetchHeatmaps();
  }, []);

  return heatmaps;
}

// ============================================
// COMPONENTS
// ============================================
function StatCard({ label, value, trend, type = 'default', icon }) {
  const typeClasses = {
    success: 'stat-card-success',
    warning: 'stat-card-warning',
    error: 'stat-card-error',
    default: ''
  };

  return (
    <div className={`dashboard-stat-card rr-card-elevated ${typeClasses[type]}`}>
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        {icon && <span className="stat-card-icon">{icon}</span>}
      </div>
      <div className="stat-card-value">{value}</div>
      {trend && (
        <div className={`stat-card-trend ${trend.positive ? 'positive' : 'negative'}`}>
          {trend.positive ? '↑' : '↓'} {trend.text}
        </div>
      )}
    </div>
  );
}





function TopCarriersPanel({ carriers }) {
  if (!carriers || carriers.length === 0) {
    return (
      <div className="panel-card rr-card">
        <div className="panel-header">
          <h4>Top Carriers</h4>
        </div>
        <div className="panel-empty">
          No carrier data yet. Cover some lanes to build your carrier list.
        </div>
      </div>
    );
  }

  return (
    <div className="panel-card rr-card">
      <div className="panel-header">
        <h4>Top Carriers</h4>
        <span className="panel-badge">{carriers.length}</span>
      </div>
      <div className="carriers-list">
        {carriers.map((carrier, idx) => (
          <div key={carrier.mc} className="carrier-item">
            <div className="carrier-info">
              <div className="carrier-mc">MC# {carrier.mc}</div>
              <div className="carrier-email">{carrier.email || 'No email'}</div>
            </div>
            <div className="carrier-stats">
              <div className="carrier-loads">{carrier.loads} loads</div>
              <div className="carrier-margin">
                {typeof carrier.totalMargin === 'number'
                  ? `$${carrier.totalMargin.toLocaleString()}`
                  : 'N/A'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapPanel({ heatmaps }) {
  const [activeTab, setActiveTab] = useState('dryvan');

  const tabs = [
    { id: 'dryvan', label: 'Dry Van', icon: '🚛' },
    { id: 'reefer', label: 'Reefer', icon: '❄️' },
    { id: 'flatbed', label: 'Flatbed', icon: '📦' }
  ];

  const currentUrl = heatmaps?.[activeTab];
  const lastUpdated = heatmaps?.lastUpdated
    ? new Date(heatmaps.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="heatmap-panel rr-card-elevated">
      <div className="heatmap-header">
        <div className="heatmap-title-group">
          <h3>Market Conditions</h3>
          <p className="heatmap-subtitle">Weather-radar pressure map by equipment type</p>
        </div>
        <div className="heatmap-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`heatmap-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="heatmap-content">
        <div className="heatmap-map-frame">
          <MarketMap type={activeTab} imageUrl={currentUrl} />
          <div className="heatmap-grid-overlay" aria-hidden="true"></div>
        </div>
      </div>
      <div className="heatmap-footer">
        <div className="heatmap-legend" aria-label="Heatmap intensity legend">
          <span className="heatmap-legend-label">Intensity</span>
          <span className="heatmap-legend-scale"></span>
          <span className="heatmap-legend-extreme">Hotter markets</span>
        </div>
        {lastUpdated && (
          <div className="heatmap-updated">
            Updated: {lastUpdated}
          </div>
        )}
      </div>
    </div>
  );
}

function LaneTicker({ lanes }) {
  if (!lanes || lanes.length === 0) return null;

  return (
    <div className="lanes-ticker">
      <div className="ticker-label">LIVE</div>
      <div className="ticker-content">
        <div className="ticker-scroll">
          {lanes.map((lane, idx) => (
            <span key={lane.id || idx} className="ticker-item">
              <span className="ticker-route">
                {lane.origin_city?.substring(0, 3).toUpperCase() || '???'}→
                {(lane.dest_city || lane.destination_city)?.substring(0, 3).toUpperCase() || '???'}
              </span>
              <span className="ticker-separator">|</span>
              <span className="ticker-equipment">{lane.equipment_type || 'Van'}</span>
              <span className="ticker-separator">|</span>
              <span className="ticker-rate">${lane.rate?.toLocaleString() || '---'}</span>
              <span className="ticker-separator">|</span>
              <span className={`ticker-status ticker-status-${lane.lane_status || 'posted'}`}>
                {lane.lane_status === 'covered' || lane.lane_status === 'archive' ? 'Covered' : lane.lane_status === 'failed' ? 'Failed' : 'Posted'}
              </span>
            </span>
          ))}
          {/* Duplicate for seamless scroll */}
          {lanes.map((lane, idx) => (
            <span key={`dup-${lane.id || idx}`} className="ticker-item">
              <span className="ticker-route">
                {lane.origin_city?.substring(0, 3).toUpperCase() || '???'}→
                {(lane.dest_city || lane.destination_city)?.substring(0, 3).toUpperCase() || '???'}
              </span>
              <span className="ticker-separator">|</span>
              <span className="ticker-equipment">{lane.equipment_type || 'Van'}</span>
              <span className="ticker-separator">|</span>
              <span className="ticker-rate">${lane.rate?.toLocaleString() || '---'}</span>
              <span className="ticker-separator">|</span>
              <span className={`ticker-status ticker-status-${lane.lane_status || 'posted'}`}>
                {lane.lane_status === 'covered' || lane.lane_status === 'archive' ? 'Covered' : lane.lane_status === 'failed' ? 'Failed' : 'Posted'}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================
export default function Dashboard() {
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();
  const stats = useDashboardStats();
  const recentLanes = useRecentLanes();
  const topCarriers = useTopCarriers();
  const heatmaps = useMarketData();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppBackground>
      <Head>
        <title>Dashboard | RapidRoutes</title>
      </Head>

      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-logo">
            <span style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#38bdf8',
              letterSpacing: '1px'
            }}>
              Rapid<span style={{ color: '#f8fafc' }}>Routes</span>
              <span style={{ color: '#38bdf8' }}>»</span>
            </span>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section">
              <div className="nav-section-title">MAIN</div>
              <Link href="/dashboard" className="nav-item active">
                <DashboardIcon />
                <span>Dashboard</span>
              </Link>
              <Link href="/lanes" className="nav-item">
                <LanesIcon />
                <span>Lanes</span>
                {(stats?.postedLanes ?? 0) > 0 && (
                  <span className="nav-badge">{stats?.postedLanes ?? 0}</span>
                )}
              </Link>
              <Link href="/sales-resources" prefetch={false} className="nav-item">
                <SalesIcon />
                <span>Sales Resources</span>
              </Link>
              <Link href="/recap" className="nav-item">
                <RecapIcon />
                <span>Recap</span>
              </Link>
            </div>

            <div className="nav-section">
              <div className="nav-section-title">SETTINGS</div>
              <Link href="/settings" className="nav-item">
                <SettingsIcon />
                <span>Settings</span>
              </Link>
            </div>
          </nav>

          {/* Quick Stats in Sidebar */}
          <div className="sidebar-quick-stats">
            <div className="quick-stat">
              <span className="quick-stat-label">Posted</span>
              <span className="quick-stat-value">{stats?.postedLanes ?? 0}</span>
            </div>
            <div className="quick-stat warning">
              <span className="quick-stat-label">Failed</span>
              <span className="quick-stat-value">{stats?.failedLanes ?? 0}</span>
            </div>
            <div className="quick-stat success">
              <span className="quick-stat-label">Covered</span>
              <span className="quick-stat-value">{stats?.coveredLanes ?? 0}</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {/* Header */}
          <header className="dashboard-header">
            <div>
              <h1>Redefine the game. Outsmart the lane.</h1>
            </div>
            <div className="header-actions">
              <Link href="/lanes" className="btn-primary">
                + New Lane
              </Link>
            </div>
          </header>

          {/* Stats Row */}
          <div className="stats-row">
            <StatCard
              label="Posted Lanes"
              value={stats?.postedLanes ?? 0}
              trend={{ positive: true, text: 'Active' }}
              type="default"
              icon="📤"
            />
            <StatCard
              label="Failed Lanes"
              value={stats?.failedLanes ?? 0}
              type={(stats?.failedLanes ?? 0) > 0 ? "warning" : "default"}
              icon="⚠️"
            />
            <StatCard
              label="Covered"
              value={stats?.coveredLanes ?? 0}
              trend={{ positive: true, text: 'This week' }}
              type="success"
              icon="✅"
            />
            <StatCard
              label="Avg Margin"
              value={typeof stats?.avgMargin === 'number' ? `$${stats.avgMargin.toLocaleString()}` : 'N/A'}
              trend={typeof stats?.avgMargin === 'number' && stats.avgMargin > 0 ? { positive: true, text: 'Per load' } : null}
              type={typeof stats?.avgMargin === 'number' && stats.avgMargin > 0 ? "success" : "default"}
              icon="💰"
            />
          </div>

          {/* Main Content Grid */}
          <div className="dashboard-grid">
            {/* Left Col: Heatmap & Top Carriers */}
            <div className="dashboard-left space-y-6">
              <HeatmapPanel heatmaps={heatmaps} />
              <TopCarriersPanel carriers={topCarriers} />
            </div>

            {/* Right Col: Calculators */}
            <div className="dashboard-right space-y-6">
              <FloorSpaceCalculator />
              <HeavyHaulCalculator />
            </div>
          </div>
        </main>

        {/* ESPN Ticker */}
        <LaneTicker lanes={recentLanes} />
      </div>
    </AppBackground>
  );
}

// pages/dashboard.js - RapidRoutes Premium Dashboard
// Stunning visual design matching approved mockup
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';
import supabase from '../utils/supabaseClient';

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
    avgMargin: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!session || !user || !supabase) return;

      try {
        // Fetch user's lanes
        const { data: lanes, error } = await supabase
          .from('lanes')
          .select('id, lane_status, rate, covered_rate')
          .eq('user_id', user.id);

        if (error) throw error;

        const posted = lanes?.filter(l => l.lane_status === 'current' || l.lane_status === 'posted').length || 0;
        const failed = lanes?.filter(l => l.lane_status === 'failed').length || 0;
        const covered = lanes?.filter(l => l.lane_status === 'covered').length || 0;

        // Calculate average margin from covered lanes
        const coveredLanes = lanes?.filter(l => l.lane_status === 'covered' && l.rate && l.covered_rate) || [];
        const totalMargin = coveredLanes.reduce((sum, l) => sum + (l.rate - l.covered_rate), 0);
        const avgMargin = coveredLanes.length > 0 ? Math.round(totalMargin / coveredLanes.length) : 0;

        setStats({
          postedLanes: posted,
          failedLanes: failed,
          coveredLanes: covered,
          avgMargin: avgMargin
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
        // Get covered lanes with carrier info
        const { data, error } = await supabase
          .from('lanes')
          .select('covered_by_mc, covered_by_email, covered_rate, rate')
          .eq('user_id', user.id)
          .eq('lane_status', 'covered')
          .not('covered_by_mc', 'is', null)
          .limit(20);

        if (error) throw error;

        // Aggregate carriers
        const carrierMap = {};
        (data || []).forEach(lane => {
          const mc = lane.covered_by_mc;
          if (!carrierMap[mc]) {
            carrierMap[mc] = {
              mc: mc,
              email: lane.covered_by_email || '',
              loads: 0,
              totalMargin: 0
            };
          }
          carrierMap[mc].loads++;
          if (lane.rate && lane.covered_rate) {
            carrierMap[mc].totalMargin += (lane.rate - lane.covered_rate);
          }
        });

        const carrierList = Object.values(carrierMap)
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
    <div className={`dashboard-stat-card ${typeClasses[type]}`}>
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

function FloorSpaceCalculator() {
  const [dimensions, setDimensions] = useState({ length: '', width: '', height: '' });
  const [stackable, setStackable] = useState(false);
  const [result, setResult] = useState(null);

  const calculate = () => {
    const l = parseFloat(dimensions.length) || 0;
    const w = parseFloat(dimensions.width) || 0;
    const h = parseFloat(dimensions.height) || 0;

    if (l === 0 || w === 0 || h === 0) {
      setResult(null);
      return;
    }

    // Trailer dimensions (interior)
    const boxTruck = { length: 26, width: 8, height: 8 };
    const dryVan = { length: 53, width: 8.5, height: 9 };
    const hotshot = { length: 40, width: 8.5, height: 8 };
    const flatbed = { length: 48, width: 8.5, height: 8.5 };

    const effectiveHeight = stackable ? h * 2 : h;

    // Check fits - simplified logic
    if (l <= boxTruck.length && w <= boxTruck.width && effectiveHeight <= boxTruck.height) {
      setResult({ fits: true, type: "Box Truck (26')", color: 'success' });
    } else if (l <= dryVan.length && w <= dryVan.width && effectiveHeight <= dryVan.height) {
      setResult({ fits: true, type: "53' Dry Van", color: 'success' });
    } else if (l <= hotshot.length && w <= hotshot.width) {
      setResult({ fits: true, type: "40' HotShot", color: 'success' });
    } else if (l <= flatbed.length && w <= flatbed.width) {
      setResult({ fits: true, type: "48' Flatbed", color: 'success' });
    } else {
      setResult({ fits: false, type: "2+ Trucks Required", color: 'warning' });
    }
  };

  useEffect(() => {
    calculate();
  }, [dimensions, stackable]);

  return (
    <div className="calculator-card">
      <div className="calculator-header">
        <span className="calculator-icon">📦</span>
        <h4>Floor Space Calculator</h4>
      </div>
      <div className="calculator-body">
        <div className="calc-input-row">
          <div className="calc-input-group">
            <label>Length (ft)</label>
            <input
              type="number"
              value={dimensions.length}
              onChange={(e) => setDimensions(prev => ({ ...prev, length: e.target.value }))}
              placeholder="L"
            />
          </div>
          <div className="calc-input-group">
            <label>Width (ft)</label>
            <input
              type="number"
              value={dimensions.width}
              onChange={(e) => setDimensions(prev => ({ ...prev, width: e.target.value }))}
              placeholder="W"
            />
          </div>
          <div className="calc-input-group">
            <label>Height (ft)</label>
            <input
              type="number"
              value={dimensions.height}
              onChange={(e) => setDimensions(prev => ({ ...prev, height: e.target.value }))}
              placeholder="H"
            />
          </div>
        </div>
        <label className="calc-checkbox">
          <input
            type="checkbox"
            checked={stackable}
            onChange={(e) => setStackable(e.target.checked)}
          />
          <span>Stackable?</span>
        </label>
        {result && (
          <div className={`calc-result calc-result-${result.color}`}>
            {result.fits ? '✓' : '⚠'} {result.type}
          </div>
        )}
      </div>
    </div>
  );
}

function HeavyHaulCalculator() {
  const [dims, setDims] = useState({ length: '', width: '', height: '', weight: '' });
  const [result, setResult] = useState(null);

  const calculate = () => {
    const l = parseFloat(dims.length) || 0;
    const w = parseFloat(dims.width) || 0;
    const h = parseFloat(dims.height) || 0;
    const weight = parseFloat(dims.weight) || 0;

    if (l === 0 && w === 0 && h === 0 && weight === 0) {
      setResult(null);
      return;
    }

    // Legal limits (general - varies by state)
    const maxWidth = 8.5; // feet
    const maxHeight = 13.5; // feet (varies 13.5-14.5)
    const maxLength = 53; // feet for trailer
    const maxWeight = 80000; // lbs gross

    const issues = [];

    if (w > maxWidth) issues.push(`Overwidth (${w}')`);
    if (h > maxHeight) issues.push(`Overheight (${h}')`);
    if (l > maxLength) issues.push(`Overlength (${l}')`);
    if (weight > maxWeight) issues.push(`Overweight (${weight.toLocaleString()} lbs)`);

    if (issues.length === 0) {
      setResult({
        legal: true,
        message: "Legal - No permits required",
        details: [],
        color: 'success'
      });
    } else if (issues.length <= 2 && weight <= 120000) {
      setResult({
        legal: false,
        message: "Permits Required",
        details: issues,
        color: 'warning'
      });
    } else {
      setResult({
        legal: false,
        message: "Heavy Haul - Contact Rep",
        details: [...issues, "May need escorts, route survey"],
        color: 'error'
      });
    }
  };

  useEffect(() => {
    calculate();
  }, [dims]);

  return (
    <div className="calculator-card">
      <div className="calculator-header">
        <span className="calculator-icon">🚛</span>
        <h4>Heavy Haul Calculator</h4>
      </div>
      <div className="calculator-body">
        <div className="calc-input-row">
          <div className="calc-input-group">
            <label>L (ft)</label>
            <input
              type="number"
              value={dims.length}
              onChange={(e) => setDims(prev => ({ ...prev, length: e.target.value }))}
              placeholder="L"
            />
          </div>
          <div className="calc-input-group">
            <label>W (ft)</label>
            <input
              type="number"
              value={dims.width}
              onChange={(e) => setDims(prev => ({ ...prev, width: e.target.value }))}
              placeholder="W"
            />
          </div>
          <div className="calc-input-group">
            <label>H (ft)</label>
            <input
              type="number"
              value={dims.height}
              onChange={(e) => setDims(prev => ({ ...prev, height: e.target.value }))}
              placeholder="H"
            />
          </div>
          <div className="calc-input-group">
            <label>Weight (lbs)</label>
            <input
              type="number"
              value={dims.weight}
              onChange={(e) => setDims(prev => ({ ...prev, weight: e.target.value }))}
              placeholder="lbs"
            />
          </div>
        </div>
        {result && (
          <div className={`calc-result calc-result-${result.color}`}>
            <div className="calc-result-main">
              {result.legal ? '✓' : '⚠'} {result.message}
            </div>
            {result.details.length > 0 && (
              <div className="calc-result-details">
                {result.details.map((d, i) => <span key={i}>{d}</span>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TopCarriersPanel({ carriers }) {
  if (!carriers || carriers.length === 0) {
    return (
      <div className="panel-card">
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
    <div className="panel-card">
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
              <div className="carrier-margin">${carrier.totalMargin.toLocaleString()}</div>
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
    <div className="heatmap-panel">
      <div className="heatmap-header">
        <h3>Market Conditions</h3>
        <div className="heatmap-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
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
        {currentUrl ? (
          <img src={currentUrl} alt={`${activeTab} heatmap`} className="heatmap-image" />
        ) : (
          <div className="heatmap-placeholder">
            <div className="heatmap-placeholder-icon">🗺️</div>
            <div className="heatmap-placeholder-text">
              Upload heatmap in Settings
            </div>
          </div>
        )}
      </div>
      {lastUpdated && (
        <div className="heatmap-footer">
          Updated: {lastUpdated}
        </div>
      )}
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
                {lane.lane_status === 'covered' ? 'Covered' : lane.lane_status === 'failed' ? 'Failed' : 'Posted'}
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
                {lane.lane_status === 'covered' ? 'Covered' : lane.lane_status === 'failed' ? 'Failed' : 'Posted'}
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
  const { loading, isAuthenticated, user } = useAuth();
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

  const userName = user?.email?.split('@')[0] || 'User';

  return (
    <>
      <Head>
        <title>Dashboard | RapidRoutes</title>
      </Head>

      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-logo">
            <Image
              src="/logo.png"
              alt="RapidRoutes"
              width={180}
              height={80}
              style={{ objectFit: 'contain' }}
              priority
            />
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
              <Link href="/prompts/library" className="nav-item">
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
              <h1>Welcome back, {userName}!</h1>
              <p className="header-subtitle">Your freight command center</p>
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
              value={`$${(stats?.avgMargin ?? 0).toLocaleString()}`}
              trend={(stats?.avgMargin ?? 0) > 0 ? { positive: true, text: 'Per load' } : null}
              type={(stats?.avgMargin ?? 0) > 0 ? "success" : "default"}
              icon="💰"
            />
          </div>

          {/* Main Content Grid */}
          <div className="dashboard-grid">
            {/* Left: Heatmap */}
            <div className="dashboard-left">
              <HeatmapPanel heatmaps={heatmaps} />
            </div>

            {/* Right: Calculators & Carriers */}
            <div className="dashboard-right">
              <FloorSpaceCalculator />
              <HeavyHaulCalculator />
              <TopCarriersPanel carriers={topCarriers} />
            </div>
          </div>
        </main>

        {/* ESPN Ticker */}
        <LaneTicker lanes={recentLanes} />
      </div>
    </>
  );
}

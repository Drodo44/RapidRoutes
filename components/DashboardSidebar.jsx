import Link from 'next/link';
import { useRouter } from 'next/router';

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

export default function DashboardSidebar({ stats }) {
    const router = useRouter();
    const currentPath = router.pathname;

    return (
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
                    <Link href="/dashboard" className={`nav-item ${currentPath === '/dashboard' ? 'active' : ''}`}>
                        <DashboardIcon />
                        <span>Dashboard</span>
                    </Link>
                    <Link href="/lanes" className={`nav-item ${currentPath === '/lanes' ? 'active' : ''}`}>
                        <LanesIcon />
                        <span>Lanes</span>
                        {(stats?.postedLanes ?? 0) > 0 && (
                            <span className="nav-badge">{stats?.postedLanes ?? 0}</span>
                        )}
                    </Link>
                    <Link
                        href="/sales-resources"
                        prefetch={false}
                        className={`nav-item ${currentPath === '/sales-resources' ? 'active' : ''}`}
                    >
                        <SalesIcon />
                        <span>Sales Resources</span>
                    </Link>
                    <Link href="/recap" className={`nav-item ${currentPath === '/recap' ? 'active' : ''}`}>
                        <RecapIcon />
                        <span>Recap</span>
                    </Link>
                </div>

                <div className="nav-section">
                    <div className="nav-section-title">SETTINGS</div>
                    <Link href="/settings" className={`nav-item ${currentPath === '/settings' ? 'active' : ''}`}>
                        <SettingsIcon />
                        <span>Settings</span>
                    </Link>
                </div>
            </nav>

            {/* Quick Stats in Sidebar - Optional, can be hidden if stats not passed */}
            {stats && (
                <div className="sidebar-quick-stats">
                    <div className="quick-stat">
                        <span className="quick-stat-label">Posted</span>
                        <span className="quick-stat-value">{stats.postedLanes ?? 0}</span>
                    </div>
                    <div className="quick-stat warning">
                        <span className="quick-stat-label">Failed</span>
                        <span className="quick-stat-value">{stats.failedLanes ?? 0}</span>
                    </div>
                    <div className="quick-stat success">
                        <span className="quick-stat-label">Covered</span>
                        <span className="quick-stat-value">{stats.coveredLanes ?? 0}</span>
                    </div>
                </div>
            )}
        </aside>
    );
}

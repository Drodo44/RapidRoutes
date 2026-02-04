// File: src/components/Sidebar.jsx
// RapidRoutes 2.0 - Navigation Sidebar
// Magic UI styled sidebar with inline SVG icons

import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';

export default function Sidebar() {
    const router = useRouter();
    const currentPath = router.pathname;

    const navItems = [
        {
            href: '/command-center',
            label: 'Command Center',
            icon: <HomeIcon />
        },
        {
            href: '/admin',
            label: 'Market Admin',
            icon: <SettingsIcon />
        },
        {
            href: '/lanes',
            label: 'New Lane',
            icon: <PlusIcon />
        }
    ];

    return (
        <aside style={styles.sidebar}>
            {/* Logo Section */}
            <div style={styles.logoSection}>
                <Link href="/command-center" style={styles.logoLink}>
                    <Image
                        src="/logo.png"
                        alt="RapidRoutes"
                        width={160}
                        height={40}
                        style={{ objectFit: 'contain' }}
                        priority
                    />
                </Link>
            </div>

            {/* Navigation */}
            <nav style={styles.nav}>
                <div style={styles.navLabel}>Navigation</div>
                <ul style={styles.navList}>
                    {navItems.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                style={{
                                    ...styles.navItem,
                                    ...(currentPath === item.href ? styles.navItemActive : {})
                                }}
                            >
                                <span style={styles.navIcon}>{item.icon}</span>
                                <span style={styles.navText}>{item.label}</span>
                                {currentPath === item.href && (
                                    <span style={styles.activeIndicator} />
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Footer */}
            <div style={styles.footer}>
                <div style={styles.version}>RapidRoutes v2.0</div>
            </div>
        </aside>
    );
}

// Inline SVG Icons
function HomeIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}

function SettingsIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    );
}

function PlusIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

const styles = {
    sidebar: {
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 'var(--sidebar-width, 260px)',
        background: 'linear-gradient(180deg, rgba(10, 10, 10, 0.95) 0%, rgba(5, 5, 5, 0.98) 100%)',
        borderRight: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
    },
    logoSection: {
        padding: '24px 20px',
        borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
    },
    logoLink: {
        display: 'block',
        textDecoration: 'none',
    },
    nav: {
        flex: 1,
        padding: '20px 12px',
        overflowY: 'auto',
    },
    navLabel: {
        fontSize: '0.625rem',
        fontWeight: '600',
        color: 'var(--text-tertiary, #525252)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        padding: '0 8px',
        marginBottom: '12px',
    },
    navList: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '10px',
        color: 'var(--text-secondary, #A3A3A3)',
        textDecoration: 'none',
        fontSize: '0.875rem',
        fontWeight: '500',
        transition: 'all 0.15s ease',
        position: 'relative',
    },
    navItemActive: {
        background: 'rgba(59, 130, 246, 0.1)',
        color: 'var(--primary, #3B82F6)',
    },
    navIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
    },
    navText: {
        flex: 1,
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: '3px',
        height: '24px',
        background: 'var(--primary, #3B82F6)',
        borderRadius: '0 2px 2px 0',
    },
    footer: {
        padding: '16px 20px',
        borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
    },
    version: {
        fontSize: '0.75rem',
        color: 'var(--text-tertiary, #525252)',
        textAlign: 'center',
    },
};

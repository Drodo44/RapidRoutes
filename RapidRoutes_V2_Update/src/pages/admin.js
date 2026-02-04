// File: src/pages/admin.js
// RapidRoutes 2.0 - Admin Page
// Market administration interface for rate calibration

import Head from 'next/head';
import Sidebar from '@/components/Sidebar';
import RateMapWidget from '@/components/admin/RateMapWidget';
import MarketCalibrationWidget from '@/components/admin/MarketCalibrationWidget';
import { useState } from 'react';

export default function AdminPage() {
    const [rateMapUrl, setRateMapUrl] = useState('');

    return (
        <>
            <Head>
                <title>Market Admin | RapidRoutes</title>
                <meta name="description" content="Admin panel for market rate calibration" />
            </Head>

            {/* Animated Background */}
            <div className="background" />

            {/* App Shell */}
            <div className="app-shell">
                {/* Sidebar */}
                <Sidebar />

                {/* Main Content */}
                <main style={styles.mainContent}>
                    {/* Page Header */}
                    <header style={styles.header}>
                        <h1 style={styles.pageTitle}>Market Administration</h1>
                        <p style={styles.pageSubtitle}>
                            Calibrate regional market multipliers and view rate maps
                        </p>
                    </header>

                    {/* Two-Column Layout: Map on Left, Calibration on Right */}
                    <div style={styles.twoColumnLayout}>
                        {/* Left Column: Rate Map */}
                        <div style={styles.leftColumn}>
                            <RateMapWidget
                                imageUrl={rateMapUrl}
                                onImageUrlChange={setRateMapUrl}
                            />
                        </div>

                        {/* Right Column: Market Calibration */}
                        <div style={styles.rightColumn}>
                            <MarketCalibrationWidget />
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}

const styles = {
    mainContent: {
        flex: 1,
        marginLeft: 'var(--sidebar-width, 260px)',
        padding: 'var(--space-6)',
        minHeight: '100vh',
    },
    header: {
        marginBottom: 'var(--space-6)',
    },
    pageTitle: {
        fontSize: '1.5rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
        marginBottom: '4px',
    },
    pageSubtitle: {
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
    },
    twoColumnLayout: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-6)',
        alignItems: 'start',
    },
    leftColumn: {
        minHeight: '500px',
    },
    rightColumn: {
        // Takes remaining space
    },
};

// Responsive adjustments for smaller screens
if (typeof window !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 1200px) {
            .admin-two-column {
                grid-template-columns: 1fr !important;
            }
        }
    `;
    document.head.appendChild(style);
}

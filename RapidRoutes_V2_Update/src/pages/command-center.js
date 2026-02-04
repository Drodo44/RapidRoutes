// File: src/pages/command-center.js
// RapidRoutes 2.0 - Lane Command Center
// Split-screen layout: Left (Lane List) | Right (Workspace)

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Sidebar from '@/components/Sidebar';
import LaneList from '@/components/command-center/LaneList';
import Workspace from '@/components/command-center/Workspace';
import { getBrowserSupabase } from '@/lib/supabaseClient';

export default function CommandCenterPage() {
    const [lanes, setLanes] = useState([]);
    const [selectedLane, setSelectedLane] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('current');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch lanes from database
    const fetchLanes = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const supabase = getBrowserSupabase();
            let query = supabase
                .from('lanes')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply status filter
            if (filterStatus !== 'all') {
                query = query.eq('status', filterStatus);
            }

            const { data, error: fetchError } = await query.limit(100);

            if (fetchError) {
                console.error('[CommandCenter] Fetch error:', fetchError);
                setError('Failed to load lanes');
                return;
            }

            setLanes(data || []);
        } catch (err) {
            console.error('[CommandCenter] Error:', err);
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => {
        fetchLanes();
    }, [fetchLanes]);

    // Filter lanes by search term
    const filteredLanes = lanes.filter(lane => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        const origin = `${lane.origin_city} ${lane.origin_state}`.toLowerCase();
        const dest = `${lane.destination_city || lane.destinationCity} ${lane.destination_state || lane.destinationState}`.toLowerCase();
        return origin.includes(search) || dest.includes(search);
    });

    // Handle lane selection
    const handleSelectLane = (lane) => {
        setSelectedLane(lane);
    };

    // Handle lane update (after archive, etc.)
    const handleLaneUpdate = (updatedLane) => {
        setLanes(prev => prev.map(l => l.id === updatedLane.id ? updatedLane : l));
        if (selectedLane?.id === updatedLane.id) {
            setSelectedLane(updatedLane);
        }
    };

    // Handle lane archived/removed
    const handleLaneArchived = (laneId) => {
        setLanes(prev => prev.filter(l => l.id !== laneId));
        if (selectedLane?.id === laneId) {
            setSelectedLane(null);
        }
        // Refresh to ensure consistency
        fetchLanes();
    };

    return (
        <>
            <Head>
                <title>Command Center | RapidRoutes</title>
                <meta name="description" content="Lane Command Center - Manage your freight lanes" />
            </Head>

            {/* Animated Background */}
            <div className="background" />

            {/* App Shell */}
            <div className="app-shell">
                {/* Sidebar */}
                <Sidebar />

                {/* Main Content Area */}
                <main style={styles.mainContent}>
                    {/* Header */}
                    <header style={styles.header}>
                        <h1 style={styles.pageTitle}>Lane Command Center</h1>
                        <div style={styles.headerActions}>
                            <span style={styles.laneCount}>
                                {filteredLanes.length} lane{filteredLanes.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </header>

                    {/* Split Screen Layout */}
                    <div className="split-layout">
                        {/* Left Panel: Lane List */}
                        <div className="split-panel-left glass-panel" style={styles.leftPanel}>
                            <LaneList
                                lanes={filteredLanes}
                                loading={loading}
                                error={error}
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                filterStatus={filterStatus}
                                onFilterChange={setFilterStatus}
                                selectedLaneId={selectedLane?.id}
                                onSelectLane={handleSelectLane}
                            />
                        </div>

                        {/* Right Panel: Workspace */}
                        <div className="split-panel-right">
                            {selectedLane ? (
                                <Workspace
                                    lane={selectedLane}
                                    onLaneUpdate={handleLaneUpdate}
                                    onLaneArchived={handleLaneArchived}
                                />
                            ) : (
                                <EmptyState />
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}

// Empty state when no lane is selected
function EmptyState() {
    return (
        <div className="glass-panel" style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <h2 style={styles.emptyTitle}>Select a Lane</h2>
            <p style={styles.emptyText}>
                Choose a lane from the list to view details, calculate margins, and manage coverage.
            </p>
        </div>
    );
}

const styles = {
    mainContent: {
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        padding: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-4)',
        flexShrink: 0,
    },
    pageTitle: {
        fontSize: '1.5rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
    },
    headerActions: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
    },
    laneCount: {
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
    },
    leftPanel: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 0,
        overflow: 'hidden',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 'var(--space-10)',
        textAlign: 'center',
    },
    emptyIcon: {
        fontSize: '3rem',
        marginBottom: 'var(--space-4)',
        opacity: 0.5,
    },
    emptyTitle: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
        marginBottom: 'var(--space-2)',
    },
    emptyText: {
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
        maxWidth: '300px',
    },
};

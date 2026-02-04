// File: src/components/command-center/LaneList.jsx
// RapidRoutes 2.0 - Lane List Component
// Left panel of Command Center - searchable, filterable lane list

import { useState } from 'react';

export default function LaneList({
    lanes = [],
    loading = false,
    error = null,
    searchTerm = '',
    onSearchChange,
    filterStatus = 'current',
    onFilterChange,
    selectedLaneId = null,
    onSelectLane
}) {
    const statusFilters = [
        { value: 'current', label: 'Active' },
        { value: 'saved', label: 'Saved' },
        { value: 'archived', label: 'Archived' },
        { value: 'all', label: 'All' }
    ];

    return (
        <div style={styles.container}>
            {/* Search Header */}
            <div style={styles.searchHeader}>
                <div style={styles.searchBox}>
                    <SearchIcon />
                    <input
                        type="text"
                        className="input"
                        placeholder="Search lanes..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
            </div>

            {/* Filter Tabs */}
            <div style={styles.filterTabs}>
                {statusFilters.map(filter => (
                    <button
                        key={filter.value}
                        onClick={() => onFilterChange(filter.value)}
                        style={{
                            ...styles.filterTab,
                            ...(filterStatus === filter.value ? styles.filterTabActive : {})
                        }}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Lane List */}
            <div style={styles.listContainer}>
                {loading ? (
                    <div style={styles.loadingState}>
                        <LoadingSpinner />
                        <span>Loading lanes...</span>
                    </div>
                ) : error ? (
                    <div style={styles.errorState}>
                        <span style={styles.errorIcon}>⚠️</span>
                        <span>{error}</span>
                    </div>
                ) : lanes.length === 0 ? (
                    <div style={styles.emptyState}>
                        <span style={styles.emptyIcon}>📭</span>
                        <span>No lanes found</span>
                    </div>
                ) : (
                    <div style={styles.laneList}>
                        {lanes.map(lane => (
                            <LaneListItem
                                key={lane.id}
                                lane={lane}
                                isSelected={lane.id === selectedLaneId}
                                onClick={() => onSelectLane(lane)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Individual Lane Item
function LaneListItem({ lane, isSelected, onClick }) {
    const originCity = lane.origin_city || 'Unknown';
    const originState = lane.origin_state || '';
    const destCity = lane.destination_city || lane.destinationCity || 'Unknown';
    const destState = lane.destination_state || lane.destinationState || '';
    const equipment = lane.equipment_label || lane.equipment || 'Van';
    const miles = lane.miles || lane.distance || '—';

    return (
        <div
            onClick={onClick}
            style={{
                ...styles.laneItem,
                ...(isSelected ? styles.laneItemSelected : {})
            }}
        >
            {/* Route */}
            <div style={styles.routeRow}>
                <span style={styles.origin}>{originCity}, {originState}</span>
                <span style={styles.arrow}>→</span>
                <span style={styles.destination}>{destCity}, {destState}</span>
            </div>

            {/* Meta Row */}
            <div style={styles.metaRow}>
                <span className="badge badge-neutral" style={styles.badge}>
                    {equipment}
                </span>
                <span style={styles.miles}>{miles} mi</span>
                <StatusBadge status={lane.status} />
            </div>
        </div>
    );
}

// Status Badge
function StatusBadge({ status }) {
    const statusStyles = {
        current: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', label: 'Active' },
        saved: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', label: 'Saved' },
        archived: { bg: 'rgba(113, 113, 122, 0.15)', color: '#71717A', label: 'Archived' }
    };

    const style = statusStyles[status] || statusStyles.current;

    return (
        <span style={{
            ...styles.statusBadge,
            background: style.bg,
            color: style.color
        }}>
            {style.label}
        </span>
    );
}

// Icons
function SearchIcon() {
    return (
        <svg style={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
        </svg>
    );
}

function LoadingSpinner() {
    return (
        <svg style={styles.spinner} viewBox="0 0 24 24" fill="none">
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    },
    searchHeader: {
        padding: 'var(--space-4)',
        borderBottom: '1px solid var(--border)',
    },
    searchBox: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    searchIcon: {
        position: 'absolute',
        left: '12px',
        width: '18px',
        height: '18px',
        color: 'var(--text-tertiary)',
        pointerEvents: 'none',
    },
    searchInput: {
        paddingLeft: '40px',
        background: 'var(--surface)',
    },
    filterTabs: {
        display: 'flex',
        padding: 'var(--space-2) var(--space-4)',
        gap: 'var(--space-2)',
        borderBottom: '1px solid var(--border)',
    },
    filterTab: {
        padding: 'var(--space-2) var(--space-3)',
        background: 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-secondary)',
        fontSize: '0.75rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
    },
    filterTabActive: {
        background: 'var(--primary)',
        color: 'white',
    },
    listContainer: {
        flex: 1,
        overflow: 'auto',
        padding: 'var(--space-2)',
    },
    laneList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
    },
    laneItem: {
        padding: 'var(--space-4)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
    },
    laneItemSelected: {
        background: 'var(--surface-elevated)',
        borderColor: 'var(--primary)',
        boxShadow: '0 0 0 1px var(--primary)',
    },
    routeRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-2)',
    },
    origin: {
        fontWeight: '500',
        color: 'var(--text-primary)',
        fontSize: '0.875rem',
    },
    arrow: {
        color: 'var(--text-tertiary)',
        fontSize: '0.75rem',
    },
    destination: {
        fontWeight: '500',
        color: 'var(--text-primary)',
        fontSize: '0.875rem',
    },
    metaRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
    },
    badge: {
        fontSize: '0.625rem',
    },
    miles: {
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
    },
    statusBadge: {
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '0.625rem',
        fontWeight: '500',
        marginLeft: 'auto',
    },
    loadingState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-10)',
        color: 'var(--text-secondary)',
        fontSize: '0.875rem',
    },
    errorState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-10)',
        color: 'var(--error)',
        fontSize: '0.875rem',
    },
    errorIcon: {
        fontSize: '1.5rem',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-10)',
        color: 'var(--text-secondary)',
        fontSize: '0.875rem',
    },
    emptyIcon: {
        fontSize: '1.5rem',
    },
    spinner: {
        width: '24px',
        height: '24px',
        animation: 'spin 1s linear infinite',
    },
};

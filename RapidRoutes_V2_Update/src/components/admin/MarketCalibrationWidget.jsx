// File: src/components/admin/MarketCalibrationWidget.jsx
// RapidRoutes 2.0 - Market Calibration Widget
// Admin tool for adjusting regional market multipliers

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Regions and their states for display
const REGIONS = {
    southeast: ['FL', 'GA', 'SC', 'NC', 'AL', 'TN', 'MS', 'LA'],
    midwest: ['IL', 'IN', 'OH', 'MI', 'WI', 'MN', 'IA', 'MO'],
    northeast: ['NY', 'PA', 'NJ', 'CT', 'MA', 'ME', 'NH', 'VT', 'RI'],
    southwest: ['TX', 'AZ', 'NM', 'OK'],
    west: ['CA', 'WA', 'OR', 'NV', 'UT', 'CO'],
    mountains: ['MT', 'WY', 'ID', 'ND', 'SD', 'NE', 'KS']
};

export default function MarketCalibrationWidget() {
    const [marketConditions, setMarketConditions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    // Form state for current live rates
    const [liveRates, setLiveRates] = useState({});

    // Fetch market conditions
    const fetchMarketConditions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('market_conditions')
                .select('*')
                .order('region', { ascending: true });

            if (fetchError) {
                console.error('[MarketCalibration] Fetch error:', fetchError);
                setError('Failed to load market conditions');
                return;
            }

            setMarketConditions(data || []);

            // Initialize live rates from current data
            const initialRates = {};
            (data || []).forEach(condition => {
                initialRates[condition.region] = condition.current_rate_per_mile?.toString() || '';
            });
            setLiveRates(initialRates);
        } catch (err) {
            console.error('[MarketCalibration] Error:', err);
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMarketConditions();
    }, [fetchMarketConditions]);

    // Calculate multiplier: Live Input / Historical Avg
    const calculateMultiplier = (region) => {
        const condition = marketConditions.find(c => c.region === region);
        if (!condition) return null;

        const liveRate = parseFloat(liveRates[region]) || 0;
        const historicalAvg = condition.historical_avg_rate || 0;

        // Divide-by-zero safety
        if (historicalAvg <= 0) {
            return { multiplier: 1.0, valid: false, reason: 'No historical data' };
        }

        const multiplier = liveRate / historicalAvg;
        return { multiplier, valid: true };
    };

    // Handle rate input change
    const handleRateChange = (region, value) => {
        setLiveRates(prev => ({
            ...prev,
            [region]: value
        }));
    };

    // Save all multipliers
    const handleSaveAll = async () => {
        setSaving(true);
        setError(null);
        setSuccessMessage('');

        try {
            const updates = Object.entries(liveRates).map(([region, rateStr]) => {
                const liveRate = parseFloat(rateStr) || 0;
                const condition = marketConditions.find(c => c.region === region);
                const historicalAvg = condition?.historical_avg_rate || 1;
                const multiplier = historicalAvg > 0 ? liveRate / historicalAvg : 1.0;

                return {
                    region,
                    current_rate_per_mile: liveRate,
                    current_multiplier: multiplier,
                    updated_at: new Date().toISOString()
                };
            });

            // Update each region
            for (const update of updates) {
                const { error: updateError } = await supabase
                    .from('market_conditions')
                    .update({
                        current_rate_per_mile: update.current_rate_per_mile,
                        current_multiplier: update.current_multiplier,
                        updated_at: update.updated_at
                    })
                    .eq('region', update.region);

                if (updateError) {
                    throw updateError;
                }
            }

            setSuccessMessage('Market conditions updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);

            // Refresh data
            fetchMarketConditions();
        } catch (err) {
            console.error('[MarketCalibration] Save error:', err);
            setError('Failed to save market conditions');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="glass-panel" style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>
                        <SettingsIcon /> Market Calibration
                    </h3>
                    <p style={styles.subtitle}>
                        Adjust regional multipliers based on current market rates
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSaveAll}
                    disabled={saving || loading}
                >
                    {saving ? 'Saving...' : 'Save All'}
                </button>
            </div>

            {/* Messages */}
            {error && (
                <div style={styles.errorBox}>⚠️ {error}</div>
            )}
            {successMessage && (
                <div style={styles.successBox}>✓ {successMessage}</div>
            )}

            {/* Content */}
            {loading ? (
                <div style={styles.loadingState}>
                    <span>Loading market conditions...</span>
                </div>
            ) : (
                <div style={styles.grid}>
                    {Object.entries(REGIONS).map(([region, states]) => {
                        const condition = marketConditions.find(c => c.region === region);
                        const multiplierResult = calculateMultiplier(region);

                        return (
                            <div key={region} style={styles.regionCard}>
                                {/* Region Header */}
                                <div style={styles.regionHeader}>
                                    <span style={styles.regionName}>
                                        {capitalizeFirst(region)}
                                    </span>
                                    <span style={styles.stateList}>
                                        {states.join(', ')}
                                    </span>
                                </div>

                                {/* Historical Average */}
                                <div style={styles.statRow}>
                                    <span style={styles.statLabel}>Historical Avg</span>
                                    <span style={styles.statValue}>
                                        ${condition?.historical_avg_rate?.toFixed(2) || '0.00'}/mi
                                    </span>
                                </div>

                                {/* Current Live Rate Input */}
                                <div style={styles.inputGroup}>
                                    <label style={styles.inputLabel}>Current Live Rate ($/mi)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="0.00"
                                        value={liveRates[region] || ''}
                                        onChange={(e) => handleRateChange(region, e.target.value)}
                                        min="0"
                                        step="0.01"
                                        style={styles.rateInput}
                                    />
                                </div>

                                {/* Calculated Multiplier */}
                                <div style={styles.multiplierRow}>
                                    <span style={styles.multiplierLabel}>Live Multiplier</span>
                                    <span style={{
                                        ...styles.multiplierValue,
                                        color: multiplierResult?.valid ? 'var(--success)' : 'var(--text-secondary)'
                                    }}>
                                        ×{multiplierResult?.multiplier?.toFixed(3) || '1.000'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Formula Note */}
            <div style={styles.formulaNote}>
                <strong>Formula:</strong> Live Multiplier = Current Input ÷ Historical Avg
            </div>
        </div>
    );
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function SettingsIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginRight: '8px' }}
        >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    );
}

const styles = {
    container: {
        padding: 'var(--space-5)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 'var(--space-5)',
    },
    title: {
        fontSize: '1.125rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        marginBottom: '4px',
    },
    subtitle: {
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
    },
    errorBox: {
        padding: 'var(--space-3) var(--space-4)',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--error)',
        fontSize: '0.875rem',
        marginBottom: 'var(--space-4)',
    },
    successBox: {
        padding: 'var(--space-3) var(--space-4)',
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--success)',
        fontSize: '0.875rem',
        marginBottom: 'var(--space-4)',
    },
    loadingState: {
        padding: 'var(--space-10)',
        textAlign: 'center',
        color: 'var(--text-secondary)',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 'var(--space-4)',
    },
    regionCard: {
        padding: 'var(--space-4)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
    },
    regionHeader: {
        marginBottom: 'var(--space-3)',
        paddingBottom: 'var(--space-3)',
        borderBottom: '1px solid var(--border)',
    },
    regionName: {
        display: 'block',
        fontSize: '1rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
        marginBottom: '2px',
    },
    stateList: {
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
    },
    statRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-3)',
    },
    statLabel: {
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
    },
    statValue: {
        fontSize: '0.875rem',
        fontWeight: '500',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-mono)',
    },
    inputGroup: {
        marginBottom: 'var(--space-3)',
    },
    inputLabel: {
        display: 'block',
        fontSize: '0.625rem',
        fontWeight: '500',
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '4px',
    },
    rateInput: {
        fontSize: '0.875rem',
    },
    multiplierRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--space-2)',
        background: 'rgba(16, 185, 129, 0.05)',
        borderRadius: 'var(--radius-sm)',
    },
    multiplierLabel: {
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
    },
    multiplierValue: {
        fontSize: '1rem',
        fontWeight: '700',
        fontFamily: 'var(--font-mono)',
    },
    formulaNote: {
        marginTop: 'var(--space-5)',
        padding: 'var(--space-3)',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        textAlign: 'center',
    },
};

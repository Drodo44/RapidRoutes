// File: src/components/workspace/MarketArbitrageWidget.jsx
// RapidRoutes 2.0 - Market Arbitrage Widget
// Displays market rate comparison and selling script

import { useState, useEffect } from 'react';
import { calculateArbitrage, getArbitrageForLane } from '@/lib/arbitrageCalculator';

export default function MarketArbitrageWidget({ lane }) {
    const [arbitrage, setArbitrage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchArbitrage() {
            if (!lane) return;

            setLoading(true);
            setError(null);

            try {
                const result = await getArbitrageForLane(lane);

                if (result.error) {
                    setError(result.error);
                } else {
                    setArbitrage(result);
                }
            } catch (err) {
                console.error('[MarketArbitrageWidget] Error:', err);
                setError('Failed to calculate arbitrage');
            } finally {
                setLoading(false);
            }
        }

        fetchArbitrage();
    }, [lane?.id]);

    // Determine if positive arbitrage exists
    const hasPositiveArbitrage = arbitrage?.arbitrage?.exists && arbitrage.arbitrage.rateDifference > 0;

    return (
        <div className="widget">
            {/* Widget Header */}
            <div className="widget-header">
                <h3 className="widget-title">📊 Market Arbitrage</h3>
                {arbitrage && (
                    <span style={{
                        ...styles.diffBadge,
                        background: hasPositiveArbitrage ? 'rgba(16, 185, 129, 0.15)' : 'rgba(113, 113, 122, 0.15)',
                        color: hasPositiveArbitrage ? 'var(--success)' : 'var(--text-secondary)'
                    }}>
                        {hasPositiveArbitrage ? '+' : ''}${arbitrage.arbitrage.rateDifference.toFixed(2)}/mi
                    </span>
                )}
            </div>

            {/* Content */}
            <div style={styles.content}>
                {loading ? (
                    <div style={styles.loadingState}>
                        <LoadingSpinner />
                        <span>Calculating market rates...</span>
                    </div>
                ) : error ? (
                    <div style={styles.errorState}>
                        <span>⚠️ {error}</span>
                    </div>
                ) : arbitrage ? (
                    <>
                        {/* Market Comparison */}
                        <div style={styles.marketComparison}>
                            {/* Origin Market */}
                            <div style={styles.marketCard}>
                                <div style={styles.marketLabel}>Origin Market</div>
                                <div style={styles.marketRegion}>{capitalizeFirst(arbitrage.originMarket.region)}</div>
                                <div style={styles.marketRate}>
                                    ${arbitrage.originMarket.liveRate.toFixed(2)}<span style={styles.perMile}>/mi</span>
                                </div>
                                {arbitrage.originMarket.multiplier !== 1 && (
                                    <div style={styles.multiplierNote}>
                                        ×{arbitrage.originMarket.multiplier.toFixed(2)} adj.
                                    </div>
                                )}
                            </div>

                            {/* Arrow */}
                            <div style={styles.arrowContainer}>
                                <span style={styles.arrow}>→</span>
                            </div>

                            {/* Destination Market */}
                            <div style={styles.marketCard}>
                                <div style={styles.marketLabel}>Destination Market</div>
                                <div style={styles.marketRegion}>{capitalizeFirst(arbitrage.destinationMarket.region)}</div>
                                <div style={{
                                    ...styles.marketRate,
                                    color: hasPositiveArbitrage ? 'var(--success)' : 'var(--text-primary)'
                                }}>
                                    ${arbitrage.destinationMarket.liveRate.toFixed(2)}<span style={styles.perMile}>/mi</span>
                                </div>
                                {arbitrage.destinationMarket.multiplier !== 1 && (
                                    <div style={styles.multiplierNote}>
                                        ×{arbitrage.destinationMarket.multiplier.toFixed(2)} adj.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Selling Script */}
                        {arbitrage.arbitrage.recommendation && (
                            <div style={{
                                ...styles.sellingScript,
                                borderColor: hasPositiveArbitrage ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'
                            }}>
                                <div style={styles.scriptIcon}>💡</div>
                                <div style={styles.scriptContent}>
                                    <div style={styles.scriptLabel}>Selling Script</div>
                                    <div style={{
                                        ...styles.scriptText,
                                        color: hasPositiveArbitrage ? 'var(--success)' : 'var(--text-primary)'
                                    }}>
                                        {arbitrage.arbitrage.recommendation}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* No Arbitrage */}
                        {!arbitrage.arbitrage.exists && (
                            <div style={styles.noArbitrage}>
                                <span style={styles.noArbitrageIcon}>—</span>
                                <span style={styles.noArbitrageText}>
                                    Markets are balanced. No significant rate difference.
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={styles.noData}>
                        No market data available
                    </div>
                )}
            </div>
        </div>
    );
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
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
    content: {
        minHeight: '120px',
    },
    diffBadge: {
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
    },
    marketComparison: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
    },
    marketCard: {
        flex: 1,
        padding: 'var(--space-3)',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
    },
    marketLabel: {
        fontSize: '0.625rem',
        fontWeight: '500',
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '4px',
    },
    marketRegion: {
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        marginBottom: '4px',
    },
    marketRate: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
    },
    perMile: {
        fontSize: '0.75rem',
        fontWeight: '400',
        color: 'var(--text-secondary)',
    },
    multiplierNote: {
        fontSize: '0.625rem',
        color: 'var(--text-tertiary)',
        marginTop: '4px',
    },
    arrowContainer: {
        padding: '0 var(--space-2)',
    },
    arrow: {
        fontSize: '1.25rem',
        color: 'var(--text-tertiary)',
    },
    sellingScript: {
        display: 'flex',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        background: 'rgba(16, 185, 129, 0.05)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: 'var(--radius-md)',
    },
    scriptIcon: {
        fontSize: '1.25rem',
    },
    scriptContent: {
        flex: 1,
    },
    scriptLabel: {
        fontSize: '0.625rem',
        fontWeight: '600',
        color: 'var(--success)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '4px',
    },
    scriptText: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
    },
    noArbitrage: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
    },
    noArbitrageIcon: {
        fontSize: '1.25rem',
        color: 'var(--text-tertiary)',
    },
    noArbitrageText: {
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
    },
    loadingState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-6)',
        color: 'var(--text-secondary)',
        fontSize: '0.875rem',
    },
    errorState: {
        padding: 'var(--space-4)',
        color: 'var(--error)',
        fontSize: '0.875rem',
        textAlign: 'center',
    },
    noData: {
        padding: 'var(--space-6)',
        color: 'var(--text-secondary)',
        fontSize: '0.875rem',
        textAlign: 'center',
    },
    spinner: {
        width: '24px',
        height: '24px',
        animation: 'spin 1s linear infinite',
    },
};

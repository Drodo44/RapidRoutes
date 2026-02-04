// File: src/components/workspace/MarginCalculator.jsx
// RapidRoutes 2.0 - Margin Calculator Widget
// Live calculation with color-coded results

import { useState, useEffect, useMemo } from 'react';

export default function MarginCalculator({ lane, onUpdate }) {
    // Initialize with lane values if available
    const [billRate, setBillRate] = useState(lane?.bill_rate || '');
    const [payRate, setPayRate] = useState('');

    // Update bill rate when lane changes
    useEffect(() => {
        if (lane?.bill_rate) {
            setBillRate(lane.bill_rate);
        }
    }, [lane?.bill_rate]);

    // Calculate margin in real-time
    const marginResult = useMemo(() => {
        const bill = parseFloat(billRate) || 0;
        const pay = parseFloat(payRate) || 0;

        if (bill <= 0) {
            return { valid: false, message: 'Enter bill rate' };
        }
        if (pay <= 0) {
            return { valid: false, message: 'Enter pay rate' };
        }
        if (pay > bill) {
            return {
                valid: true,
                marginAmount: bill - pay,
                marginPercent: ((bill - pay) / bill) * 100,
                colorClass: 'margin-negative',
                colorCode: 'error',
                warning: 'Carrier pay exceeds bill rate!'
            };
        }

        const marginAmount = bill - pay;
        const marginPercent = ((marginAmount / bill) * 100);

        // Determine color: Green ≥15%, Yellow 10-14.9%, Red <10%
        let colorClass, colorCode;
        if (marginPercent >= 15) {
            colorClass = 'margin-positive';
            colorCode = 'success';
        } else if (marginPercent >= 10) {
            colorClass = 'margin-warning';
            colorCode = 'warning';
        } else {
            colorClass = 'margin-negative';
            colorCode = 'error';
        }

        return {
            valid: true,
            marginAmount,
            marginPercent,
            colorClass,
            colorCode
        };
    }, [billRate, payRate]);

    // Get color styles
    const getColorStyle = (colorCode) => {
        const colors = {
            success: { color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.15)' },
            warning: { color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.15)' },
            error: { color: 'var(--error)', bg: 'rgba(239, 68, 68, 0.15)' }
        };
        return colors[colorCode] || colors.success;
    };

    const colorStyle = marginResult.valid ? getColorStyle(marginResult.colorCode) : null;

    return (
        <div className="widget">
            {/* Widget Header */}
            <div className="widget-header">
                <h3 className="widget-title">💰 Margin Calculator</h3>
            </div>

            {/* Input Fields */}
            <div style={styles.inputGrid}>
                <div style={styles.inputGroup}>
                    <label className="label" htmlFor="billRate">Bill Rate ($)</label>
                    <input
                        id="billRate"
                        type="number"
                        className="input"
                        placeholder="0.00"
                        value={billRate}
                        onChange={(e) => setBillRate(e.target.value)}
                        min="0"
                        step="0.01"
                    />
                </div>
                <div style={styles.inputGroup}>
                    <label className="label" htmlFor="payRate">Carrier Pay ($)</label>
                    <input
                        id="payRate"
                        type="number"
                        className="input"
                        placeholder="0.00"
                        value={payRate}
                        onChange={(e) => setPayRate(e.target.value)}
                        min="0"
                        step="0.01"
                    />
                </div>
            </div>

            {/* Result Display */}
            <div style={{
                ...styles.resultCard,
                background: colorStyle?.bg || 'var(--surface)',
                borderColor: colorStyle?.color ? `${colorStyle.color}33` : 'var(--border)'
            }}>
                {marginResult.valid ? (
                    <>
                        {/* Warning for negative margin */}
                        {marginResult.warning && (
                            <div style={styles.warning}>
                                ⚠️ {marginResult.warning}
                            </div>
                        )}

                        {/* Margin Display */}
                        <div style={styles.marginDisplay}>
                            <div style={styles.marginRow}>
                                <span style={styles.marginLabel}>Margin Amount</span>
                                <span style={{
                                    ...styles.marginValue,
                                    color: colorStyle?.color || 'var(--text-primary)'
                                }}>
                                    ${marginResult.marginAmount.toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}
                                </span>
                            </div>
                            <div style={styles.marginRow}>
                                <span style={styles.marginLabel}>Margin Percentage</span>
                                <span style={{
                                    ...styles.marginPercent,
                                    color: colorStyle?.color || 'var(--text-primary)'
                                }}>
                                    {marginResult.marginPercent.toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        {/* Threshold Indicator */}
                        <div style={styles.thresholdBar}>
                            <div style={styles.thresholdLabels}>
                                <span style={{ color: 'var(--error)' }}>{'<10%'}</span>
                                <span style={{ color: 'var(--warning)' }}>10-15%</span>
                                <span style={{ color: 'var(--success)' }}>≥15%</span>
                            </div>
                            <div style={styles.thresholdTrack}>
                                <div style={{
                                    ...styles.thresholdFill,
                                    width: `${Math.min(100, Math.max(0, marginResult.marginPercent / 20 * 100))}%`,
                                    background: colorStyle?.color || 'var(--primary)'
                                }} />
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={styles.placeholder}>
                        <span style={styles.placeholderIcon}>📊</span>
                        <span style={styles.placeholderText}>{marginResult.message}</span>
                    </div>
                )}
            </div>

            {/* Per Mile Rate (if lane has miles) */}
            {marginResult.valid && lane?.miles && lane.miles > 0 && (
                <div style={styles.perMileSection}>
                    <div style={styles.perMileRow}>
                        <span style={styles.perMileLabel}>Bill Rate/Mile</span>
                        <span style={styles.perMileValue}>
                            ${(parseFloat(billRate) / lane.miles).toFixed(2)}/mi
                        </span>
                    </div>
                    <div style={styles.perMileRow}>
                        <span style={styles.perMileLabel}>Pay Rate/Mile</span>
                        <span style={styles.perMileValue}>
                            ${(parseFloat(payRate) / lane.miles).toFixed(2)}/mi
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    inputGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    resultCard: {
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        minHeight: '100px',
    },
    warning: {
        padding: 'var(--space-2) var(--space-3)',
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.75rem',
        color: 'var(--error)',
        marginBottom: 'var(--space-3)',
    },
    marginDisplay: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
    },
    marginRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    marginLabel: {
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
    },
    marginValue: {
        fontSize: '1.25rem',
        fontWeight: '600',
        fontFamily: 'var(--font-mono)',
    },
    marginPercent: {
        fontSize: '1.5rem',
        fontWeight: '700',
        fontFamily: 'var(--font-mono)',
    },
    thresholdBar: {
        marginTop: 'var(--space-4)',
    },
    thresholdLabels: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.625rem',
        marginBottom: 'var(--space-1)',
    },
    thresholdTrack: {
        height: '4px',
        background: 'var(--surface-elevated)',
        borderRadius: '2px',
        overflow: 'hidden',
    },
    thresholdFill: {
        height: '100%',
        borderRadius: '2px',
        transition: 'width 0.3s ease, background 0.3s ease',
    },
    placeholder: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-4)',
    },
    placeholderIcon: {
        fontSize: '1.5rem',
        opacity: 0.5,
    },
    placeholderText: {
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
    },
    perMileSection: {
        marginTop: 'var(--space-4)',
        padding: 'var(--space-3)',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
    },
    perMileRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--space-1) 0',
    },
    perMileLabel: {
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
    },
    perMileValue: {
        fontSize: '0.875rem',
        fontWeight: '500',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-primary)',
    },
};

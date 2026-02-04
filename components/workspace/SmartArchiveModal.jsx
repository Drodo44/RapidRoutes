// File: src/components/workspace/SmartArchiveModal.jsx
// RapidRoutes 2.0 - Smart Archive Modal
// Modal asking "Did you cover this?" with carrier data entry

import { useState } from 'react';
import { handleSmartArchive } from '@/services/archiveService';

export default function SmartArchiveModal({ lane, onClose, onComplete }) {
    const [step, setStep] = useState('question'); // 'question' | 'carrier-form'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Carrier form state
    const [carrierMc, setCarrierMc] = useState('');
    const [carrierName, setCarrierName] = useState('');
    const [carrierPhone, setCarrierPhone] = useState('');
    const [carrierEmail, setCarrierEmail] = useState('');
    const [payRate, setPayRate] = useState('');

    // Handle "No" - archive without coverage
    const handleArchiveWithoutCoverage = async () => {
        setLoading(true);
        setError('');

        try {
            const result = await handleSmartArchive(lane.id, { covered: false });

            if (result.success) {
                onComplete(result);
            } else {
                setError(result.error || 'Failed to archive lane');
            }
        } catch (err) {
            console.error('[SmartArchiveModal] Error:', err);
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    // Handle "Yes" - proceed to carrier form
    const handleYesCovered = () => {
        setStep('carrier-form');
    };

    // Handle carrier form submission
    const handleSubmitCarrierData = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate required fields
        if (!carrierMc.trim()) {
            setError('Carrier MC is required');
            setLoading(false);
            return;
        }
        if (!carrierName.trim()) {
            setError('Carrier Name is required');
            setLoading(false);
            return;
        }

        try {
            const carrierData = {
                covered: true,
                carrier_mc: carrierMc.trim(),
                carrier_name: carrierName.trim(),
                carrier_phone: carrierPhone.trim() || null,
                carrier_email: carrierEmail.trim() || null,
                pay_rate: payRate ? parseFloat(payRate) : null
            };

            const result = await handleSmartArchive(lane.id, carrierData);

            if (result.success) {
                onComplete(result);
            } else {
                setError(result.error || 'Failed to save carrier data');
            }
        } catch (err) {
            console.error('[SmartArchiveModal] Error:', err);
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    // Handle escape key
    const handleKeyDown = (e) => {
        if (e.key === 'Escape' && !loading) {
            onClose();
        }
    };

    return (
        <div
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
            onKeyDown={handleKeyDown}
        >
            <div className="modal" role="dialog" aria-labelledby="modal-title">
                {/* Modal Header */}
                <div className="modal-header">
                    <h2 id="modal-title" style={styles.modalTitle}>
                        {step === 'question' ? '📦 Archive Lane' : '🚛 Carrier Information'}
                    </h2>
                </div>

                {/* Modal Body */}
                <div className="modal-body">
                    {/* Error Message */}
                    {error && (
                        <div style={styles.errorBox}>
                            ⚠️ {error}
                        </div>
                    )}

                    {step === 'question' ? (
                        /* Step 1: Question */
                        <div style={styles.questionContent}>
                            <div style={styles.lanePreview}>
                                <span style={styles.laneRoute}>
                                    {lane.origin_city}, {lane.origin_state} → {lane.destination_city || lane.destinationCity}, {lane.destination_state || lane.destinationState}
                                </span>
                            </div>

                            <div style={styles.questionBox}>
                                <span style={styles.questionIcon}>🤔</span>
                                <h3 style={styles.question}>Did you cover this load?</h3>
                                <p style={styles.questionHint}>
                                    If yes, we'll save the carrier info for your records.
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* Step 2: Carrier Form */
                        <form id="carrier-form" onSubmit={handleSubmitCarrierData}>
                            <div style={styles.formGrid}>
                                {/* MC Number - Required */}
                                <div style={styles.inputGroup}>
                                    <label className="label" htmlFor="carrierMc">
                                        Carrier MC <span style={styles.required}>*</span>
                                    </label>
                                    <input
                                        id="carrierMc"
                                        type="text"
                                        className="input"
                                        placeholder="MC123456"
                                        value={carrierMc}
                                        onChange={(e) => setCarrierMc(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>

                                {/* Carrier Name - Required */}
                                <div style={styles.inputGroup}>
                                    <label className="label" htmlFor="carrierName">
                                        Carrier Name <span style={styles.required}>*</span>
                                    </label>
                                    <input
                                        id="carrierName"
                                        type="text"
                                        className="input"
                                        placeholder="ABC Trucking"
                                        value={carrierName}
                                        onChange={(e) => setCarrierName(e.target.value)}
                                        required
                                    />
                                </div>

                                {/* Phone - Optional */}
                                <div style={styles.inputGroup}>
                                    <label className="label" htmlFor="carrierPhone">
                                        Phone
                                    </label>
                                    <input
                                        id="carrierPhone"
                                        type="tel"
                                        className="input"
                                        placeholder="555-123-4567"
                                        value={carrierPhone}
                                        onChange={(e) => setCarrierPhone(e.target.value)}
                                    />
                                </div>

                                {/* Email - Optional */}
                                <div style={styles.inputGroup}>
                                    <label className="label" htmlFor="carrierEmail">
                                        Email
                                    </label>
                                    <input
                                        id="carrierEmail"
                                        type="email"
                                        className="input"
                                        placeholder="dispatch@carrier.com"
                                        value={carrierEmail}
                                        onChange={(e) => setCarrierEmail(e.target.value)}
                                    />
                                </div>

                                {/* Pay Rate - Optional */}
                                <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
                                    <label className="label" htmlFor="payRate">
                                        Carrier Pay Rate ($)
                                    </label>
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
                        </form>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="modal-footer">
                    {step === 'question' ? (
                        <>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleArchiveWithoutCoverage}
                                disabled={loading}
                            >
                                {loading ? 'Archiving...' : 'No, Just Archive'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-success"
                                onClick={handleYesCovered}
                                disabled={loading}
                            >
                                Yes, I Covered It
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => setStep('question')}
                                disabled={loading}
                            >
                                ← Back
                            </button>
                            <button
                                type="submit"
                                form="carrier-form"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save & Archive'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

const styles = {
    modalTitle: {
        fontSize: '1.125rem',
        fontWeight: '600',
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
    questionContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
    },
    lanePreview: {
        padding: 'var(--space-3)',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
    },
    laneRoute: {
        fontSize: '0.875rem',
        fontWeight: '500',
        color: 'var(--text-primary)',
    },
    questionBox: {
        textAlign: 'center',
        padding: 'var(--space-4)',
    },
    questionIcon: {
        fontSize: '2.5rem',
        display: 'block',
        marginBottom: 'var(--space-3)',
    },
    question: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
        marginBottom: 'var(--space-2)',
    },
    questionHint: {
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-4)',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    required: {
        color: 'var(--error)',
    },
};

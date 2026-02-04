// File: src/components/command-center/Workspace.jsx
// RapidRoutes 2.0 - Workspace Component
// Right panel of Command Center - displays lane details and widgets

import { useState, useEffect } from 'react';
import MarketArbitrageWidget from '@/components/workspace/MarketArbitrageWidget';
import MarginCalculator from '@/components/workspace/MarginCalculator';
import SmartArchiveModal from '@/components/workspace/SmartArchiveModal';
import { getCarrierMemory } from '@/services/archiveService';

export default function Workspace({ lane, onLaneUpdate, onLaneArchived }) {
    const [carrierMemory, setCarrierMemory] = useState(null);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // Fetch carrier memory for this lane
    useEffect(() => {
        async function fetchCarrierMemory() {
            if (lane) {
                try {
                    const memory = await getCarrierMemory(lane);
                    setCarrierMemory(memory);
                } catch (err) {
                    console.error('[Workspace] Error fetching carrier memory:', err);
                }
            }
        }
        fetchCarrierMemory();
    }, [lane?.id]);

    // Extract lane details
    const originCity = lane.origin_city || 'Unknown';
    const originState = lane.origin_state || '';
    const destCity = lane.destination_city || lane.destinationCity || 'Unknown';
    const destState = lane.destination_state || lane.destinationState || '';
    const equipment = lane.equipment_label || lane.equipment || 'Van';
    const miles = lane.miles || lane.distance || 0;

    // Generate email template based on equipment type
    const generateEmailTemplate = () => {
        const isOpenDeck = ['Flatbed', 'Stepdeck', 'Step Deck', 'Lowboy', 'RGN']
            .some(e => equipment.toLowerCase().includes(e.toLowerCase()));

        if (isOpenDeck) {
            // Flatbed/Stepdeck Template
            return `Pickup: ${originCity}, ${originState} ${lane.origin_zip || ''}
Pickup Date/Time: ${lane.pickup_date || 'TBD'} (FCFS ${lane.pickup_window || 'TBD'})

Delivery: ${destCity}, ${destState} ${lane.destination_zip || ''}
Delivery Date/Time: ${lane.delivery_date || 'TBD'} (FCFS ${lane.delivery_window || 'TBD'})

Weight: ${lane.weight_lbs || 'TBD'} lbs
Commodity: ${lane.commodity || 'General Freight'}
Tarps: ${lane.tarps_required ? 'Yes' : 'No'}
Miles: ${miles}
Trailer Type: ${equipment}

Loads are given in the order information is received FCFS. To secure this load, please send this information:

MC:
Your Name:
Your Phone #:
Your Email:
Driver Name:
Driver Phone Number:
Truck Number:
Trailer Number:
TYPE Of Trailer / Equipment:
Weight You Can Scale:
Where and When Empty:
ETA To Pick up Location:`;
        } else {
            // Reefer/Van Template
            return `Pickup: ${originCity}, ${originState} ${lane.origin_zip || ''}
Pickup Date/Time: ${lane.pickup_date || 'TBD'} (Appt ${lane.pickup_time || 'TBD'})

Delivery: ${destCity}, ${destState} ${lane.destination_zip || ''}
Delivery Date/Time: ${lane.delivery_date || 'TBD'} (Appt ${lane.delivery_time || 'TBD'})

Weight: ${lane.weight_lbs || 'TBD'} lbs
Commodity: ${lane.commodity || 'General Freight'}
Temp: ${lane.temperature || 'N/A'} °F
Miles: ${miles}
Trailer Type: ${equipment}

Loads are given in the order information is received FCFS. To secure this load, please send this information:

MC:
Your Name:
Your Phone #:
Your Email:
Driver Name:
Driver Phone Number:
Truck Number:
Trailer Number:
TYPE Of Trailer / Equipment:
Weight You Can Scale:
Where and When Empty:
ETA To Pick up Location:`;
        }
    };

    // Copy email template to clipboard
    const handleCopyDetails = async () => {
        try {
            const template = generateEmailTemplate();
            await navigator.clipboard.writeText(template);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('[Workspace] Failed to copy:', err);
        }
    };

    // Handle archive button click
    const handleArchiveClick = () => {
        setShowArchiveModal(true);
    };

    // Handle archive complete
    const handleArchiveComplete = (result) => {
        setShowArchiveModal(false);
        if (result.success) {
            onLaneArchived(lane.id);
        }
    };

    return (
        <div style={styles.container}>
            {/* Lane Header */}
            <header className="glass-panel" style={styles.header}>
                <div style={styles.headerTop}>
                    <h1 style={styles.title}>
                        {originCity}, {originState} → {destCity}, {destState}
                    </h1>
                    <div style={styles.headerActions}>
                        <button
                            className="btn btn-secondary"
                            onClick={handleCopyDetails}
                            style={styles.actionBtn}
                        >
                            {copySuccess ? '✓ Copied!' : '📋 Copy Details'}
                        </button>
                        <button
                            className="btn btn-warning"
                            onClick={handleArchiveClick}
                            style={styles.actionBtn}
                        >
                            📦 Archive
                        </button>
                    </div>
                </div>
                <div style={styles.headerMeta}>
                    <span className="badge badge-primary">{equipment}</span>
                    <span style={styles.metaItem}>{miles} miles</span>
                    {lane.pickup_date && (
                        <span style={styles.metaItem}>📅 {lane.pickup_date}</span>
                    )}
                </div>
            </header>

            {/* Carrier Memory Banner */}
            {carrierMemory && (
                <div className="glass-panel" style={styles.carrierMemory}>
                    <span style={styles.memoryIcon}>💡</span>
                    <div style={styles.memoryContent}>
                        <span style={styles.memoryLabel}>Carrier Memory</span>
                        <span style={styles.memoryText}>
                            Last covered by <strong>{carrierMemory.carrier_name}</strong> ({carrierMemory.carrier_mc})
                            {carrierMemory.carrier_pay_rate && (
                                <> for <strong>${carrierMemory.carrier_pay_rate.toLocaleString()}</strong></>
                            )}
                        </span>
                    </div>
                </div>
            )}

            {/* Widget Grid */}
            <div className="widget-grid">
                {/* Market Arbitrage Widget */}
                <MarketArbitrageWidget lane={lane} />

                {/* Margin Calculator Widget */}
                <MarginCalculator lane={lane} onUpdate={onLaneUpdate} />
            </div>

            {/* Smart Archive Modal */}
            {showArchiveModal && (
                <SmartArchiveModal
                    lane={lane}
                    onClose={() => setShowArchiveModal(false)}
                    onComplete={handleArchiveComplete}
                />
            )}
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        height: '100%',
    },
    header: {
        padding: 'var(--space-5)',
    },
    headerTop: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-3)',
    },
    title: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
    },
    headerActions: {
        display: 'flex',
        gap: 'var(--space-2)',
    },
    actionBtn: {
        fontSize: '0.75rem',
    },
    headerMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
    },
    metaItem: {
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
    },
    carrierMemory: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    memoryIcon: {
        fontSize: '1.25rem',
    },
    memoryContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    memoryLabel: {
        fontSize: '0.625rem',
        fontWeight: '600',
        color: 'var(--success)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    memoryText: {
        fontSize: '0.875rem',
        color: 'var(--text-primary)',
    },
};

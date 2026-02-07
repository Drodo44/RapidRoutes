// components/CoverageModal.jsx
// Enhanced modal for tracking lane coverage with carrier details

import { useState, useEffect } from 'react';

export default function CoverageModal({ isOpen, onClose, onSelect, laneInfo }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1 = select source, 2 = enter details
  const [selectedSource, setSelectedSource] = useState(null);
  const [carrierDetails, setCarrierDetails] = useState({
    mc_number: '',
    carrier_email: '',
    rate_paid: '',
  });
  const [margin, setMargin] = useState(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedSource(null);
      setCarrierDetails({ mc_number: '', carrier_email: '', rate_paid: '' });
      setMargin(null);
    }
  }, [isOpen]);

  // Calculate margin when rate_paid changes
  useEffect(() => {
    if (carrierDetails.rate_paid && laneInfo?.rate) {
      const paid = parseFloat(carrierDetails.rate_paid);
      const posted = parseFloat(laneInfo.rate);
      if (!isNaN(paid) && !isNaN(posted)) {
        setMargin(posted - paid);
      } else {
        setMargin(null);
      }
    } else {
      setMargin(null);
    }
  }, [carrierDetails.rate_paid, laneInfo?.rate]);

  if (!isOpen) return null;

  const handleSourceSelect = (source) => {
    setSelectedSource(source);
    setStep(2);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Pass all coverage data to parent
      await onSelect({
        source: selectedSource,
        ...carrierDetails,
        margin: margin,
      });
      onClose();
    } catch (error) {
      console.error('Error saving coverage:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    fontSize: '15px',
    color: 'var(--text-primary, #fff)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s ease',
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target.className === 'modal-overlay') onClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: 'var(--surface, #0A0A0A)',
          borderRadius: '16px',
          padding: '0',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, transparent 100%)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary, #fff)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              🎉 {step === 1 ? 'Lane Covered!' : 'Carrier Details'}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary, #A3A3A3)',
                fontSize: '16px',
              }}
            >
              ✕
            </button>
          </div>
          {laneInfo && (
            <p style={{
              color: 'var(--text-secondary, #A3A3A3)',
              fontSize: '14px',
              margin: '8px 0 0 0',
            }}>
              <strong>{laneInfo.origin_city}, {laneInfo.origin_state}</strong>
              {' → '}
              <strong>{laneInfo.dest_city || laneInfo.destination_city}, {laneInfo.dest_state || laneInfo.destination_state}</strong>
              {laneInfo.rate && (
                <span style={{ marginLeft: '12px', color: 'var(--success, #10B981)' }}>
                  Posted: ${Number(laneInfo.rate).toLocaleString()}
                </span>
              )}
            </p>
          )}
        </div>

        <div style={{ padding: '24px' }}>
          {step === 1 ? (
            <>
              <p style={{
                color: 'var(--text-secondary, #A3A3A3)',
                fontSize: '14px',
                marginBottom: '16px',
              }}>
                How was this lane covered?
              </p>

              {/* Coverage Source Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { id: 'IBC', label: 'Inbound Call', icon: '📞', color: '#3b82f6' },
                  { id: 'OBC', label: 'Outbound Call', icon: '📤', color: '#10b981' },
                  { id: 'Email', label: 'Email', icon: '✉️', color: '#f59e0b' },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleSourceSelect(option.id)}
                    disabled={isSubmitting}
                    style={{
                      padding: '16px 20px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      color: 'var(--text-primary, #fff)',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = option.color;
                      e.currentTarget.style.backgroundColor = `${option.color}15`;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span style={{ fontSize: '22px' }}>{option.icon}</span>
                    <span>{option.id} – {option.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Step 2: Carrier Details Form */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  background: selectedSource === 'IBC' ? 'rgba(59, 130, 246, 0.15)' :
                    selectedSource === 'OBC' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: selectedSource === 'IBC' ? '#3b82f6' :
                    selectedSource === 'OBC' ? '#10b981' : '#f59e0b',
                  marginBottom: '16px',
                }}>
                  {selectedSource === 'IBC' ? '📞' : selectedSource === 'OBC' ? '📤' : '✉️'}
                  {selectedSource}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* MC Number */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary, #A3A3A3)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Carrier MC #
                  </label>
                  <input
                    type="text"
                    value={carrierDetails.mc_number}
                    onChange={(e) => setCarrierDetails(prev => ({ ...prev, mc_number: e.target.value }))}
                    placeholder="e.g., 123456"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary, #3B82F6)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Carrier Email */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary, #A3A3A3)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Carrier Email
                  </label>
                  <input
                    type="email"
                    value={carrierDetails.carrier_email}
                    onChange={(e) => setCarrierDetails(prev => ({ ...prev, carrier_email: e.target.value }))}
                    placeholder="dispatch@carrier.com"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary, #3B82F6)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Rate Paid */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary, #A3A3A3)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Rate Paid to Carrier ($)
                  </label>
                  <input
                    type="number"
                    value={carrierDetails.rate_paid}
                    onChange={(e) => setCarrierDetails(prev => ({ ...prev, rate_paid: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary, #3B82F6)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Margin Display */}
                {margin !== null && (
                  <div style={{
                    padding: '16px',
                    background: margin >= 0
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)'
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
                    borderRadius: '10px',
                    border: `1px solid ${margin >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{
                      fontSize: '14px',
                      color: 'var(--text-secondary, #A3A3A3)',
                      fontWeight: 500,
                    }}>
                      💰 Your Margin
                    </span>
                    <span style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: margin >= 0 ? 'var(--success, #10B981)' : 'var(--error, #EF4444)',
                    }}>
                      {margin >= 0 ? '+' : ''}{margin.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary, #A3A3A3)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{
                    flex: 2,
                    padding: '12px',
                    border: 'none',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                  }}
                >
                  {isSubmitting ? 'Saving...' : '✓ Save Coverage'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

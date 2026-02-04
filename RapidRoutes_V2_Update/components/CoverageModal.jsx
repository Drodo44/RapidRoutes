// components/CoverageModal.jsx
// Modal for selecting how a lane was covered (IBC/OBC/Email)

import { useState } from 'react';

export default function CoverageModal({ isOpen, onClose, onSelect, laneInfo }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelect = async (source) => {
    setIsSubmitting(true);
    try {
      await onSelect(source);
      onClose();
    } catch (error) {
      console.error('Error selecting coverage source:', error);
    } finally {
      setIsSubmitting(false);
    }
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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
          backgroundColor: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border-color)'
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 700, 
            color: 'var(--text-primary)',
            marginBottom: '12px'
          }}>
            🎉 How was this lane covered?
          </h2>
          {laneInfo && (
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '14px',
              marginBottom: '4px'
            }}>
              <strong>{laneInfo.origin_city}, {laneInfo.origin_state}</strong>
              {' → '}
              <strong>{laneInfo.dest_city}, {laneInfo.dest_state}</strong>
            </p>
          )}
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '14px'
          }}>
            Select a coverage source below:
          </p>
        </div>

        {/* Coverage Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => handleSelect('IBC')}
            disabled={isSubmitting}
            className="coverage-option"
            style={{
              padding: '20px 24px',
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.backgroundColor = 'var(--input-bg)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '24px' }}>📞</span>
            <span>IBC – Inbound Call</span>
          </button>

          <button
            onClick={() => handleSelect('OBC')}
            disabled={isSubmitting}
            className="coverage-option"
            style={{
              padding: '20px 24px',
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.backgroundColor = 'var(--input-bg)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '24px' }}>📤</span>
            <span>OBC – Outbound Call</span>
          </button>

          <button
            onClick={() => handleSelect('Email')}
            disabled={isSubmitting}
            className="coverage-option"
            style={{
              padding: '20px 24px',
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#f59e0b';
              e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.backgroundColor = 'var(--input-bg)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '24px' }}>✉️</span>
            <span>Email – Inbound Email</span>
          </button>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          style={{
            marginTop: '20px',
            width: '100%',
            padding: '12px',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Cancel
        </button>

        {isSubmitting && (
          <div style={{
            marginTop: '12px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '14px'
          }}>
            Recording coverage...
          </div>
        )}
      </div>
    </div>
  );
}

// components/LogContactModal.jsx
// Simple modal for logging city contact events
import { useState } from 'react';

export default function LogContactModal({ isOpen, onClose, lane, city, cityType }) {
  const [contactMethod, setContactMethod] = useState('email');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/city-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laneId: lane?.id,
          city: city?.city,
          state: city?.state || city?.state_or_province,
          cityType: cityType,
          contactMethod: contactMethod,
          referenceId: lane?.reference_id || lane?.rr_number,
          notes: notes.trim() || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to log contact');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setNotes('');
        setContactMethod('email');
      }, 1500);
    } catch (error) {
      console.error('Failed to log contact:', error);
      alert('Failed to log contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-primary, #1e293b)',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '100%',
          border: '1px solid var(--border, #334155)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border, #334155)'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text-primary, #f1f5f9)'
          }}>
            Log Contact Received
          </h3>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '14px',
            color: 'var(--text-secondary, #94a3b8)'
          }}>
            {city?.city}, {city?.state || city?.state_or_province} ({cityType})
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px' }}>
            {success ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--success, #10b981)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
                <div style={{ fontSize: '16px', fontWeight: 500 }}>Contact Logged Successfully!</div>
              </div>
            ) : (
              <>
                {/* Contact Method */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--text-primary, #f1f5f9)',
                    marginBottom: '8px'
                  }}>
                    Contact Method *
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        value="email"
                        checked={contactMethod === 'email'}
                        onChange={(e) => setContactMethod(e.target.value)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '14px', color: 'var(--text-primary, #f1f5f9)' }}>📧 Email</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        value="phone"
                        checked={contactMethod === 'phone'}
                        onChange={(e) => setContactMethod(e.target.value)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '14px', color: 'var(--text-primary, #f1f5f9)' }}>📞 Phone</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        value="unknown"
                        checked={contactMethod === 'unknown'}
                        onChange={(e) => setContactMethod(e.target.value)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '14px', color: 'var(--text-primary, #f1f5f9)' }}>❓ Unknown</span>
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--text-primary, #f1f5f9)',
                    marginBottom: '8px'
                  }}>
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional details..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      background: 'var(--bg-secondary, #0f172a)',
                      border: '1px solid var(--border, #334155)',
                      borderRadius: '6px',
                      color: 'var(--text-primary, #f1f5f9)',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!success && (
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border, #334155)',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  background: 'transparent',
                  border: '1px solid var(--border, #334155)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary, #94a3b8)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '8px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  background: 'var(--primary, #3b82f6)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1
                }}
              >
                {saving ? 'Logging...' : 'Log Contact'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

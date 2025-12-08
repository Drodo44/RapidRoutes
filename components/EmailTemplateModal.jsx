// components/EmailTemplateModal.jsx
import { useState, useEffect } from 'react';

function EmailTemplateModal({ isOpen, onClose, lanes }) {
  const [emailContent, setEmailContent] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (isOpen && lanes) {
      const availableLanes = lanes.map(lane => 
        `${lane.origin_city}, ${lane.origin_state} to: (${lane.equipment_label || lane.equipment_code})
- ${lane.destination_city}, ${lane.destination_state}`
      ).join('\n\n');
      
      // Aggregate unique commodities and equipment
      const commodities = [...new Set(lanes.map(l => l.commodity).filter(Boolean))].join(', ');
      const equipment = [...new Set(lanes.map(l => l.equipment_label || l.equipment_code).filter(Boolean))].join(', ');

      const content = `Below I have listed the lanes that are still available. Please let me know what lane you'd like and what rate you need to run it.

Please use "Reply All" when responding to this email so my team has visibility and for a faster response.

Available Lanes:

${availableLanes}

Additional Information: Commodity is ${commodities || 'Lumber'}. Tarps are required. 48' or 53'

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
ETA To Pick up Location:
`;
      setEmailContent(content);
      setCopySuccess(false); // Reset copy status when modal opens
    }
  }, [isOpen, lanes]);

  if (!isOpen) {
    return null;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(emailContent).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Hide message after 2s
    }, () => {
      // Handle copy error
      alert('Failed to copy text.');
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050,
    }}>
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        padding: '24px',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '700px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--border)'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--text-primary)' }}>Generated Email Template</h2>
        <textarea
          readOnly
          value={emailContent}
          style={{
            width: '100%',
            flex: 1,
            minHeight: '300px',
            padding: '12px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            fontFamily: 'monospace',
            fontSize: '12px',
            whiteSpace: 'pre-wrap',
          }}
        />
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          <button onClick={handleCopy} className="btn btn-primary">
            {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailTemplateModal;

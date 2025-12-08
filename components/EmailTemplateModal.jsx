// components/EmailTemplateModal.jsx
import { useState, useEffect, useRef } from 'react';

function EmailTemplateModal({ isOpen, onClose, lanes }) {
  const [htmlContent, setHtmlContent] = useState('');
  const [plainTextContent, setPlainTextContent] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (isOpen && lanes) {
      // Generate HTML Table Rows
      const rows = lanes.map(lane => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${lane.origin_city}, ${lane.origin_state}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${lane.destination_city}, ${lane.destination_state}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${lane.equipment_label || lane.equipment_code}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${lane.commodity || 'General'}</td>
        </tr>
      `).join('');

      const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <p>Below I have listed the lanes that are still available. Please let me know what lane you'd like and what rate you need to run it.</p>
          <p>Please use "Reply All" when responding to this email so my team has visibility and for a faster response.</p>
          
          <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px; font-size: 14px;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Origin</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Destination</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Equipment</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Commodity</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <p><strong>Additional Information:</strong> Tarps are required. 48' or 53'</p>

          <p>Loads are given in the order information is received FCFS. To secure this load, please send this information:</p>
          
          <ul style="list-style-type: none; padding: 0;">
            <li>MC:</li>
            <li>Your Name:</li>
            <li>Your Phone #:</li>
            <li>Your Email:</li>
            <li>Driver Name:</li>
            <li>Driver Phone Number:</li>
            <li>Truck Number:</li>
            <li>Trailer Number:</li>
            <li>TYPE Of Trailer / Equipment:</li>
            <li>Weight You Can Scale:</li>
            <li>Where and When Empty:</li>
            <li>ETA To Pick up Location:</li>
          </ul>
        </div>
      `;
      
      setHtmlContent(html);
      
      // Generate Plain Text Fallback
      const textRows = lanes.map(lane => 
        `${lane.origin_city}, ${lane.origin_state} -> ${lane.destination_city}, ${lane.destination_state} (${lane.equipment_code})`
      ).join('\n');
      
      const plainText = `Below I have listed the lanes that are still available...

Available Lanes:
${textRows}

... (See HTML for full details)`;
      
      setPlainTextContent(plainText);
    }
  }, [isOpen, lanes]);

  if (!isOpen) {
    return null;
  }

  const handleCopy = async () => {
    try {
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([plainTextContent], { type: 'text/plain' });
      
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText
        })
      ]);
      
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
      // Fallback for browsers that don't support ClipboardItem or text/html
      try {
          // Create a temporary hidden div
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;
          tempDiv.style.position = 'fixed';
          tempDiv.style.left = '-9999px';
          document.body.appendChild(tempDiv);
          
          const range = document.createRange();
          range.selectNodeContents(tempDiv);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          
          document.execCommand('copy');
          
          document.body.removeChild(tempDiv);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackErr) {
          alert('Copy failed. Please select the text and copy manually.');
      }
    }
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
        maxWidth: '800px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--border)'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--text-primary)' }}>Generated Email Template</h2>
        
        <div 
          style={{
            width: '100%',
            flex: 1,
            minHeight: '300px',
            padding: '12px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: '#fff', // White background for preview to match email
            color: '#333', // Dark text for preview
            overflowY: 'auto',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px'
          }}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
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

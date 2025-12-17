// components/EmailTemplateModal.jsx
import { useState, useEffect } from 'react';

function EmailTemplateModal({ isOpen, onClose, lanes }) {
  const [htmlContent, setHtmlContent] = useState('');
  const [plainTextContent, setPlainTextContent] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'text'

  useEffect(() => {
    if (isOpen && lanes) {
      // Deduplicate lanes based on Origin, Destination, and Equipment
      const uniqueLanes = lanes.filter((lane, index, self) =>
        index === self.findIndex((t) => (
          t.origin_city === lane.origin_city &&
          t.origin_state === lane.origin_state &&
          t.destination_city === lane.destination_city &&
          t.destination_state === lane.destination_state &&
          t.equipment_code === lane.equipment_code
        ))
      );

      // Helper to categorize equipment
      const isOpenDeck = (lane) => {
        const label = (lane.equipment_label || lane.equipment_code || '').toLowerCase();
        const code = (lane.equipment_code || '').toUpperCase();
        return (
          label.includes('flatbed') || 
          label.includes('step deck') || 
          label.includes('conestoga') || 
          label.includes('open deck') ||
          label.includes('double drop') ||
          label.includes('lowboy') ||
          label.includes('rgn') ||
          ['F', 'FD', 'SD', 'DD', 'RGN', 'FN', 'CN', 'LB', 'RG'].some(c => code.startsWith(c))
        );
      };

      const vanReeferLanes = uniqueLanes.filter(l => !isOpenDeck(l));
      const openDeckLanes = uniqueLanes.filter(l => isOpenDeck(l));

      // Sort function
      const sortLanes = (laneList) => {
        return [...laneList].sort((a, b) => {
          const originA = `${a.origin_city}, ${a.origin_state}`;
          const originB = `${b.origin_city}, ${b.origin_state}`;
          if (originA !== originB) return originA.localeCompare(originB);
          
          const destA = `${a.destination_city}, ${a.destination_state}`;
          const destB = `${b.destination_city}, ${b.destination_state}`;
          return destA.localeCompare(destB);
        });
      };

      const sortedVanReefer = sortLanes(vanReeferLanes);
      const sortedOpenDeck = sortLanes(openDeckLanes);

      // --- 1. Generate HTML Table Version ---
      const generateRows = (laneList) => laneList.map(lane => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${lane.origin_city}, ${lane.origin_state}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${lane.destination_city}, ${lane.destination_state}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${lane.equipment_label || lane.equipment_code}</td>
        </tr>
      `).join('');

      const generateTable = (rows) => `
        <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px; font-size: 14px;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Origin</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Destination</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Equipment</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;

      let htmlBody = '';

      if (sortedVanReefer.length > 0) {
        htmlBody += `<h3 style="margin-bottom: 10px; color: #333;">Van & Reefer Available Loads:</h3>`;
        htmlBody += generateTable(generateRows(sortedVanReefer));
      }

      if (sortedOpenDeck.length > 0) {
        if (sortedVanReefer.length > 0) {
          htmlBody += `<div style="height: 20px;"></div>`;
        }
        htmlBody += `<h3 style="margin-bottom: 10px; color: #333;">Open-Deck Available Loads:</h3>`;
        htmlBody += generateTable(generateRows(sortedOpenDeck));
      }

      let additionalInfoHtml = '';
      if (sortedOpenDeck.length > 0) {
        additionalInfoHtml = `<br><p style="margin-bottom: 0;"><strong>Additional Information:</strong> Tarps are required on all Flatbed or Step Deck loads unless otherwise stated.</p>`;
      }

      const html = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
          <p style="margin-bottom: 0;">Below I have listed the lanes that are still available. Please let me know what lane you'd like and what rate you need to run it.</p>
          <br>
          <p style="margin-top: 0; margin-bottom: 20px;">Please use "Reply All" when responding to this email so my team has visibility and for a faster response.</p>
          
          ${htmlBody}

          ${additionalInfoHtml}

          <br>
          <p style="margin-bottom: 5px;">Loads are given in the order information is received FCFS. To secure this load, please send this information:</p>
          <br>
          <ul style="list-style-type: none; padding: 0; margin: 0;">
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
      
      // --- 2. Generate Plain Text Version (Grouped by Origin) ---
      const generatePlainTextGroup = (laneList) => {
        // Group lanes by Origin
        const lanesByOrigin = laneList.reduce((acc, lane) => {
          const originKey = `${lane.origin_city}, ${lane.origin_state}`;
          if (!acc[originKey]) {
            acc[originKey] = [];
          }
          acc[originKey].push(lane);
          return acc;
        }, {});

        // Sort Origins Alphabetically
        const sortedOrigins = Object.entries(lanesByOrigin).sort((a, b) => a[0].localeCompare(b[0]));

        return sortedOrigins.map(([origin, originLanes]) => {
          // Check if all lanes from this origin have the same equipment
          const firstEquip = originLanes[0].equipment_label || originLanes[0].equipment_code;
          const allSameEquip = originLanes.every(l => (l.equipment_label || l.equipment_code) === firstEquip);
          
          const header = allSameEquip 
            ? `${origin} to: (${firstEquip})`
            : `${origin} to:`;

          // Sort Destinations Alphabetically
          const sortedDestinations = [...originLanes].sort((a, b) => {
            const destA = `${a.destination_city}, ${a.destination_state}`;
            const destB = `${b.destination_city}, ${b.destination_state}`;
            return destA.localeCompare(destB);
          });

          const destinations = sortedDestinations.map(lane => {
            const equipStr = allSameEquip ? '' : ` (${lane.equipment_label || lane.equipment_code})`;
            return `- ${lane.destination_city}, ${lane.destination_state}${equipStr}`;
          }).join('\n');

          return `${header}\n${destinations}`;
        }).join('\n\n');
      };

      let plainTextBody = '';

      if (sortedVanReefer.length > 0) {
        plainTextBody += `Van & Reefer Available Loads:\n\n`;
        plainTextBody += generatePlainTextGroup(sortedVanReefer);
        plainTextBody += '\n\n';
      }

      if (sortedOpenDeck.length > 0) {
        plainTextBody += `Open-Deck Available Loads:\n\n`;
        plainTextBody += generatePlainTextGroup(sortedOpenDeck);
        plainTextBody += '\n\n';
      }

      let additionalInfoText = '';
      if (sortedOpenDeck.length > 0) {
        additionalInfoText = `Additional Information: Tarps are required on all Flatbed or Step Deck loads unless otherwise stated.\n\n`;
      }

      const plainText = `Below I have listed the lanes that are still available. Please let me know what lane you'd like and what rate you need to run it.

Please use "Reply All" when responding to this email so my team has visibility and for a faster response.

${plainTextBody}${additionalInfoText}Loads are given in the order information is received FCFS. To secure this load, please send this information:

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
      setPlainTextContent(plainText);
    }
  }, [isOpen, lanes]);

  if (!isOpen) {
    return null;
  }

  const handleCopy = async () => {
    try {
      if (viewMode === 'table') {
        // Copy HTML with Plain Text Fallback
        const blobHtml = new Blob([htmlContent], { type: 'text/html' });
        const blobText = new Blob([plainTextContent], { type: 'text/plain' }); // Use full text as fallback
        
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText
          })
        ]);
      } else {
        // Copy Plain Text Only
        await navigator.clipboard.writeText(plainTextContent);
      }
      
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
      // Fallback
      try {
        if (viewMode === 'table') {
           // ... existing fallback logic for HTML ...
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
        } else {
           // Fallback for text
           const textArea = document.createElement("textarea");
           textArea.value = plainTextContent;
           textArea.style.position = "fixed";
           document.body.appendChild(textArea);
           textArea.focus();
           textArea.select();
           document.execCommand('copy');
           document.body.removeChild(textArea);
        }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Generated Email Template</h2>
          
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', padding: '2px' }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: viewMode === 'table' ? 'var(--bg-primary)' : 'transparent',
                color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              HTML Table
            </button>
            <button
              onClick={() => setViewMode('text')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: viewMode === 'text' ? 'var(--bg-primary)' : 'transparent',
                color: viewMode === 'text' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              Plain Text
            </button>
          </div>
        </div>
        
        {viewMode === 'table' ? (
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
        ) : (
          <textarea
            readOnly
            value={plainTextContent}
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
        )}
        
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          <button onClick={handleCopy} className="btn btn-primary">
            {copySuccess ? 'Copied!' : `Copy ${viewMode === 'table' ? 'Table' : 'Text'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailTemplateModal;


import { useEffect, useState } from 'react';

const TrailerVisual = ({ length = 0, width = 0, overflow = false }) => {
    const [fillPercent, setFillPercent] = useState(0);

    // Standard 53' trailer
    const MAX_LENGTH = 53;
    const VISUAL_WIDTH = 300;

    useEffect(() => {
        // Calculate fill percentage based on length (max 53ft)
        let percent = (parseFloat(length) / MAX_LENGTH) * 100;
        if (percent > 100) percent = 100; // Cap visual fill at 100 (overflow shown by color)
        if (isNaN(percent) || percent < 0) percent = 0;

        // Animate to new percentage
        const timer = setTimeout(() => {
            setFillPercent(percent);
        }, 100);

        return () => clearTimeout(timer);
    }, [length]);

    // Determine color based on usage and overflow
    let fillColor = '#3B82F6'; // Blue default
    if (overflow) fillColor = '#EF4444'; // Red if illegal/overflow
    else if (parseFloat(length) > 50) fillColor = '#F59E0B'; // Orange if tight squeeze
    else if (parseFloat(length) > 0) fillColor = '#10B981'; // Green if good

    return (
        <div className="trailer-visual-container" style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '320px', height: '100px' }}>
                {/* Cab */}
                <svg width="320" height="100" viewBox="0 0 320 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Truck Cab */}
                    <path d="M260 30H290L300 45V70H260V30Z" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                    <circle cx="270" cy="70" r="8" fill="#334155" stroke="#475569" strokeWidth="2" />
                    <circle cx="290" cy="70" r="8" fill="#334155" stroke="#475569" strokeWidth="2" />

                    {/* Trailer Outline */}
                    <rect x="10" y="25" width="240" height="50" rx="4" stroke="#475569" strokeWidth="2" fill="#0f172a" />

                    {/* Rear Wheels */}
                    <circle cx="30" cy="75" r="8" fill="#334155" stroke="#475569" strokeWidth="2" />
                    <circle cx="50" cy="75" r="8" fill="#334155" stroke="#475569" strokeWidth="2" />

                    {/* Fill Animation */}
                    <mask id="trailerMsg">
                        <rect x="12" y="27" width="236" height="46" rx="2" fill="white" />
                    </mask>

                    <rect
                        x="12"
                        y="27"
                        width={2.36 * fillPercent}
                        height="46"
                        rx="2"
                        fill={fillColor}
                        mask="url(#trailerMsg)"
                        style={{ transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1), fill 0.5s ease' }}
                    >
                        <animate
                            attributeName="opacity"
                            values="0.8;1;0.8"
                            dur="2s"
                            repeatCount="indefinite"
                        />
                    </rect>

                    {/* Grid lines inside trailer for effect */}
                    <path d="M70 27V73" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <path d="M130 27V73" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <path d="M190 27V73" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                </svg>

                {/* Dynamic Label */}
                <div style={{ position: 'absolute', top: '38px', left: '20px', right: '80px', textAlign: 'center', pointerEvents: 'none' }}>
                    <span style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#fff',
                        textShadow: '0 1px 2px black',
                        opacity: fillPercent > 10 ? 1 : 0
                    }}>
                        {Math.round(fillPercent)}% FILLED
                    </span>
                </div>
            </div>
        </div>
    );
};

export default TrailerVisual;

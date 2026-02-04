// File: src/components/admin/RateMapWidget.jsx
// RapidRoutes 2.0 - Rate Map Widget
// Visual reference tool for weekly rate map display

import { useState } from 'react';

export default function RateMapWidget({ imageUrl, onImageUrlChange }) {
    const [inputUrl, setInputUrl] = useState(imageUrl || '');
    const [previewUrl, setPreviewUrl] = useState(imageUrl || '');
    const [imageError, setImageError] = useState(false);

    const handleApply = () => {
        setPreviewUrl(inputUrl);
        setImageError(false);
        if (onImageUrlChange) {
            onImageUrlChange(inputUrl);
        }
    };

    const handleImageError = () => {
        setImageError(true);
    };

    return (
        <div className="glass-panel" style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h3 style={styles.title}>
                    <MapIcon /> Weekly Rate Map
                </h3>
            </div>

            {/* URL Input */}
            <div style={styles.inputRow}>
                <input
                    type="text"
                    className="input"
                    placeholder="Paste image URL..."
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    style={styles.urlInput}
                />
                <button
                    className="btn btn-primary btn-sm"
                    onClick={handleApply}
                    disabled={!inputUrl.trim()}
                >
                    Apply
                </button>
            </div>

            {/* Image Display */}
            <div style={styles.imageContainer}>
                {previewUrl ? (
                    imageError ? (
                        <div style={styles.errorState}>
                            <span style={styles.errorIcon}>⚠️</span>
                            <span style={styles.errorText}>Failed to load image</span>
                            <span style={styles.errorHint}>Check the URL and try again</span>
                        </div>
                    ) : (
                        <img
                            src={previewUrl}
                            alt="Weekly Rate Map"
                            style={styles.image}
                            onError={handleImageError}
                        />
                    )
                ) : (
                    <div style={styles.placeholder}>
                        <span style={styles.placeholderIcon}>🗺️</span>
                        <span style={styles.placeholderText}>No rate map uploaded</span>
                        <span style={styles.placeholderHint}>Paste an image URL above to display</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Map Icon
function MapIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginRight: '8px' }}
        >
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
    );
}

const styles = {
    container: {
        padding: 'var(--space-5)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        marginBottom: 'var(--space-4)',
    },
    title: {
        fontSize: '1rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
    },
    inputRow: {
        display: 'flex',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
    },
    urlInput: {
        flex: 1,
    },
    imageContainer: {
        flex: 1,
        minHeight: '300px',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    placeholder: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-6)',
        textAlign: 'center',
    },
    placeholderIcon: {
        fontSize: '2.5rem',
        opacity: 0.5,
    },
    placeholderText: {
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
    },
    placeholderHint: {
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
    },
    errorState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-6)',
        textAlign: 'center',
    },
    errorIcon: {
        fontSize: '2rem',
    },
    errorText: {
        fontSize: '0.875rem',
        color: 'var(--error)',
    },
    errorHint: {
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
    },
};

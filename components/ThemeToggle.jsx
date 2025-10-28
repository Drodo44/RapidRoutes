// components/ThemeToggle.jsx
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle({ compact = false }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        className="btn-secondary"
        style={{
          padding: compact ? '6px 10px' : '8px 12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: compact ? '12px' : '13px'
        }}
        disabled
      >
        <span style={{ width: '16px', height: '16px', opacity: 0.3 }}>◐</span>
        {!compact && <span>Theme</span>}
      </button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="btn-secondary"
      style={{
        padding: compact ? '6px 10px' : '8px 12px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: compact ? '12px' : '13px',
        transition: 'all 0.2s ease'
      }}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <>
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m17.07-7.07l-4.24 4.24m-5.66 0L3.93 3.93m0 16.14l4.24-4.24m5.66 0l4.24 4.24" strokeWidth="2" stroke="currentColor" fill="none" />
          </svg>
          {!compact && <span>Light</span>}
        </>
      ) : (
        <>
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          {!compact && <span>Dark</span>}
        </>
      )}
    </button>
  );
}

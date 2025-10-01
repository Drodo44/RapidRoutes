/** 
 * ENTERPRISE THEME SYSTEM
 * Professional, clean, dark-mode color palette
 * NO neon, NO childish colors
 */

module.exports = {
  colors: {
    // Backgrounds - Slate gray scale
    bg: {
      primary: '#0f172a',    // Main background
      secondary: '#1e293b',  // Card backgrounds
      tertiary: '#334155',   // Hover states
      elevated: '#1e293b',   // Modals, dropdowns
    },
    
    // Text - High contrast, professional
    text: {
      primary: '#f8fafc',    // Main text
      secondary: '#cbd5e1',  // Supporting text
      tertiary: '#94a3b8',   // Muted text
      disabled: '#64748b',   // Disabled states
    },
    
    // Accents - Professional blue
    accent: {
      primary: '#3b82f6',    // Primary actions
      hover: '#60a5fa',      // Hover states
      active: '#2563eb',     // Active/pressed
      subtle: '#1e40af',     // Subtle backgrounds
    },
    
    // Status colors - Muted, professional
    status: {
      success: '#10b981',    // Green - success states
      successBg: '#064e3b',  // Success backgrounds
      warning: '#f59e0b',    // Amber - warnings
      warningBg: '#78350f',  // Warning backgrounds
      error: '#ef4444',      // Red - errors
      errorBg: '#7f1d1d',    // Error backgrounds
      info: '#6366f1',       // Indigo - info
      infoBg: '#312e81',     // Info backgrounds
    },
    
    // Borders - Subtle, refined
    border: {
      default: '#334155',    // Standard borders
      hover: '#475569',      // Hover borders
      focus: '#3b82f6',      // Focus rings
      subtle: '#1e293b',     // Very subtle dividers
    },
    
    // Special - Professional highlights
    special: {
      kma: '#8b5cf6',        // Purple for KMA badges
      kmaBg: '#3730a3',      // KMA badge backgrounds
      generated: '#ec4899',  // Pink for generated items
      generatedBg: '#831843',// Generated backgrounds
      selected: '#3b82f6',   // Selected items
      selectedBg: '#1e3a8a', // Selected backgrounds
    }
  },
  
  // Typography scale
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
  },
  
  // Spacing scale (compact, enterprise)
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
    '2xl': '2rem',   // 32px
  },
  
  // Border radius (subtle, modern)
  radius: {
    sm: '0.25rem',   // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    full: '9999px',  // Pills
  },
  
  // Shadows (subtle, professional)
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  }
};

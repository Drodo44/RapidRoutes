/**
 * ENTERPRISE UI COMPONENT LIBRARY
 * Glassmorphism design with cyan accents
 */

import React from 'react';

// Button Component - Glassmorphism with cyan primary
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none border-0';

  const variants = {
    primary: 'text-white disabled:opacity-50',
    secondary: 'text-white disabled:opacity-50',
    success: 'text-white disabled:opacity-50',
    danger: 'text-white disabled:opacity-50',
    ghost: 'disabled:opacity-50',
  };

  const variantStyles = {
    primary: {
      background: '#06B6D4',
      boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
    },
    secondary: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    success: {
      background: '#10b981',
    },
    danger: {
      background: '#F75A68',
    },
    ghost: {
      background: 'transparent',
      color: '#94A3B8',
    },
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2.5 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-lg',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      style={variantStyles[variant]}
      onMouseEnter={(e) => {
        if (!disabled && !loading && variant === 'primary') {
          e.target.style.background = '#22D3EE';
          e.target.style.boxShadow = '0 0 30px rgba(6, 182, 212, 0.4)';
          e.target.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading && variant === 'primary') {
          e.target.style.background = '#06B6D4';
          e.target.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.3)';
          e.target.style.transform = 'translateY(0)';
        }
      }}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};

// Card Component - Glassmorphism container
export const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// Input Component - Dark glassmorphism input
export const Input = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: '#CBD5E1'
        }}>
          {label}
        </label>
      )}
      <input
        className={className}
        style={{
          width: '100%',
          padding: '10px 14px',
          fontSize: '14px',
          color: '#F1F5F9',
          background: 'rgba(0, 0, 0, 0.3)',
          border: error ? '1px solid #F75A68' : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#06B6D4';
          e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.15)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? '#F75A68' : 'rgba(255, 255, 255, 0.1)';
          e.target.style.boxShadow = 'none';
        }}
        {...props}
      />
      {error && (
        <p style={{ fontSize: '12px', color: '#F75A68' }}>{error}</p>
      )}
      {helperText && !error && (
        <p style={{ fontSize: '12px', color: '#64748b' }}>{helperText}</p>
      )}
    </div>
  );
};

// Select Component - Dark glassmorphism dropdown
export const Select = ({
  label,
  error,
  options = [],
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: '#CBD5E1'
        }}>
          {label}
        </label>
      )}
      <select
        className={className}
        style={{
          width: '100%',
          padding: '10px 14px',
          fontSize: '14px',
          color: '#F1F5F9',
          background: 'rgba(0, 0, 0, 0.3)',
          border: error ? '1px solid #F75A68' : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          transition: 'all 0.2s ease',
          outline: 'none',
          cursor: 'pointer',
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: '#1f2937' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p style={{ fontSize: '12px', color: '#F75A68' }}>{error}</p>
      )}
    </div>
  );
};

// Badge Component - KMA and status badges with cyan
export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const variantStyles = {
    default: {
      background: 'rgba(255, 255, 255, 0.1)',
      color: '#94A3B8',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    kma: {
      background: 'rgba(6, 182, 212, 0.15)',
      color: '#A5F3FC',
      border: '1px solid rgba(6, 182, 212, 0.3)',
    },
    success: {
      background: 'rgba(16, 185, 129, 0.15)',
      color: '#86efac',
      border: '1px solid rgba(16, 185, 129, 0.3)',
    },
    warning: {
      background: 'rgba(245, 158, 11, 0.15)',
      color: '#fde68a',
      border: '1px solid rgba(245, 158, 11, 0.3)',
    },
    error: {
      background: 'rgba(247, 90, 104, 0.15)',
      color: '#fca5a5',
      border: '1px solid rgba(247, 90, 104, 0.3)',
    },
  };

  const sizes = {
    sm: { padding: '2px 8px', fontSize: '11px' },
    md: { padding: '4px 10px', fontSize: '12px' },
    lg: { padding: '6px 12px', fontSize: '14px' },
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md ${className}`}
      style={{
        ...variantStyles[variant],
        ...sizes[size],
      }}
    >
      {children}
    </span>
  );
};

// Checkbox Component - Clean selection with cyan
export const Checkbox = ({
  label,
  checked,
  onChange,
  className = '',
  ...props
}) => {
  return (
    <label className={`inline-flex items-center cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{
          width: '16px',
          height: '16px',
          accentColor: '#06B6D4',
          cursor: 'pointer',
        }}
        {...props}
      />
      {label && (
        <span style={{ marginLeft: '8px', fontSize: '14px', color: '#CBD5E1' }}>{label}</span>
      )}
    </label>
  );
};

// Loading Spinner with cyan
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: { width: '16px', height: '16px' },
    md: { width: '24px', height: '24px' },
    lg: { width: '32px', height: '32px' },
  };

  return (
    <div
      className={`animate-spin ${className}`}
      style={{
        ...sizes[size],
        border: '2px solid rgba(6, 182, 212, 0.2)',
        borderTopColor: '#06B6D4',
        borderRadius: '50%',
      }}
    />
  );
};

// Empty State Component
export const EmptyState = ({ icon, title, description, action }) => {
  return (
    <div className="text-center py-12">
      {icon && <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', color: '#64748b' }}>{icon}</div>}
      <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#F1F5F9', marginBottom: '8px' }}>{title}</h3>
      {description && <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>{description}</p>}
      {action && action}
    </div>
  );
};

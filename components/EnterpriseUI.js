/**
 * ENTERPRISE UI COMPONENT LIBRARY
 * Clean, professional, reusable components
 */

import React from 'react';

// Button Component - Professional, clean
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
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900';
  
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 disabled:bg-blue-800 disabled:opacity-50',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500 disabled:opacity-50',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 disabled:opacity-50',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 disabled:opacity-50',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 focus:ring-slate-600 disabled:opacity-50',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-lg',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
      )}
      {children}
    </button>
  );
};

// Card Component - Clean container
export const Card = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`bg-slate-800 rounded-lg border border-slate-700 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Input Component - Professional form input
export const Input = ({ 
  label, 
  error, 
  helperText,
  className = '',
  ...props 
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  );
};

// Select Component - Clean dropdown
export const Select = ({ 
  label, 
  error, 
  options = [],
  className = '',
  ...props 
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <select
        className={`w-full px-3 py-2 bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
};

// Badge Component - KMA and status badges
export const Badge = ({ 
  children, 
  variant = 'default',
  size = 'md',
  className = '' 
}) => {
  const variants = {
    default: 'bg-slate-700 text-slate-300',
    kma: 'bg-violet-900/50 text-violet-300 border border-violet-700',
    success: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700',
    warning: 'bg-amber-900/50 text-amber-300 border border-amber-700',
    error: 'bg-red-900/50 text-red-300 border border-red-700',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };
  
  return (
    <span className={`inline-flex items-center font-medium rounded-md ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};

// Checkbox Component - Clean selection
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
        className="w-4 h-4 bg-slate-900 border-slate-600 rounded text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors"
        {...props}
      />
      {label && (
        <span className="ml-2 text-sm text-slate-300">{label}</span>
      )}
    </label>
  );
};

// Loading Spinner
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };
  
  return (
    <svg className={`animate-spin text-blue-500 ${sizes[size]} ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
    </svg>
  );
};

// Empty State Component
export const EmptyState = ({ icon, title, description, action }) => {
  return (
    <div className="text-center py-12">
      {icon && <div className="mb-4 flex justify-center text-slate-600">{icon}</div>}
      <h3 className="text-lg font-medium text-slate-300 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-500 mb-6">{description}</p>}
      {action && action}
    </div>
  );
};

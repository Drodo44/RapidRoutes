// components/post-options/Toast.js
import React, { useEffect } from 'react';

/**
 * A simple toast notification component
 * 
 * @param {Object} props
 * @param {string} props.message - The message to display
 * @param {string} props.type - The type of toast: 'success', 'error', 'info', 'warning'
 * @param {Function} props.onClose - Callback when toast is closed
 * @param {number} props.duration - Duration in milliseconds before auto-close
 */
export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!message) return null;

  // Pre-define all style variants to avoid function calls during render
  const typeStyles = {
    success: 'bg-green-800 text-green-100 border border-green-700',
    error: 'bg-red-800 text-red-100 border border-red-700',
    warning: 'bg-yellow-800 text-yellow-100 border border-yellow-700',
    info: 'bg-blue-800 text-blue-100 border border-blue-700'
  };
  
  // Use the pre-defined style or fall back to info style
  const styleClass = typeStyles[type] || typeStyles.info;

  return (
    <div className={`p-4 mb-4 rounded ${styleClass} flex justify-between items-center`}>
      <div>{message}</div>
      {onClose && (
        <button 
          onClick={onClose}
          className="ml-4 text-sm opacity-70 hover:opacity-100"
          aria-label="Close"
        >
          ×
        </button>
      )}
    </div>
  );
}

/**
 * Custom hook for managing toast notifications
 * @returns {Object} Toast state and methods
 */
export function useToast() {
  const [toast, setToast] = React.useState(null);

  const showToast = ({ message, type = 'info', duration = 4000 }) => {
    setToast({ message, type, duration });
  };

  const hideToast = () => {
    setToast(null);
  };

  return {
    toast,
    showToast,
    hideToast,
    ToastComponent: toast ? (
      <Toast
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onClose={hideToast}
      />
    ) : null
  };
}